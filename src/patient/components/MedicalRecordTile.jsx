import { useEffect, useId, useState } from "react";
import { useApp } from "../state/AppContext";
import { getFile, download } from "../services/files";
import { makeSamplePdf } from "../services/recordPdf";
import { recordTag } from "../services/records";
import { formatDate } from "../../shared/data";
import { RecordThumbnail } from "./RecordDocuments";
import { AiSpark } from "./AiNote";
import { AbhaLogo, Button, Sheet, Icon } from "./ui";
import s from "./MedicalRecordTile.module.css";

export default function MedicalRecordTile({ record, onOpen, line }) {
  const { activeMember, brand, notify } = useApp();
  const analysisId = useId();
  const statusId = useId();
  const category = recordTag(record);
  const hasAnalysis = !!(
    record.params?.length ||
    (record.summary && ["Radiology", "Pathology"].includes(record.type))
  );
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const fileName = record.uploaded
    ? record.fileName || `${record.title}.pdf`
    : `${record.title.replace(/\W+/g, "-")}.pdf`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFile(null);
    setError("");
    (record.uploaded
      ? getFile(record.id)
      : makeSamplePdf(record, activeMember, brand)
    )
      .then((blob) => {
        if (cancelled) return;
        if (blob) setFile(blob);
        else setError("Original file unavailable. Please upload it again.");
      })
      .catch(() => {
        if (!cancelled)
          setError("Could not load this document. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, record, activeMember, brand]);

  function close() {
    setOpen(false);
  }
  function save() {
    download(fileName, file);
    close(true);
    notify("Download started.");
  }
  async function share() {
    const attachment = new File([file], fileName, { type: file.type });
    close(true);
    try {
      if (navigator.canShare?.({ files: [attachment] })) {
        await navigator.share({ files: [attachment], title: record.title });
      } else {
        download(fileName, file);
        notify(
          "File downloaded. Share it from your device’s Files or Downloads app.",
        );
      }
    } catch (issue) {
      if (issue.name !== "AbortError")
        notify("Sharing could not start. Download the file to share it.", true);
    }
  }

  return (
    <article className={s.tile} aria-label={record.title}>
      <button
        type="button"
        className={s.open}
        aria-label={`View ${record.title}`}
        aria-describedby={
          [hasAnalysis && analysisId, line && statusId]
            .filter(Boolean)
            .join(" ") || undefined
        }
        onClick={() => onOpen(record)}
      >
        <span className={s.preview}>
          <RecordThumbnail record={record} />
          {category && (
            <span className={s.category} title={category}>
              {category}
              {record.source === "abha" && <AbhaLogo />}
            </span>
          )}
          {hasAnalysis && (
            <span className={s.analysisTag} id={analysisId}>
              <AiSpark size={14} /> AI analysis
            </span>
          )}
        </span>
        <strong className={s.title} title={record.title}>
          {record.title}
        </strong>
      </button>
      <div className={s.footer}>
        <div className={s.metadata}>
          <time dateTime={record.date}>{formatDate(record.date)}</time>
        </div>
        <button
          type="button"
          className={s.actions}
          aria-label={`Actions for ${record.title}`}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <span className={s.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
        <Sheet
          open={open}
          onClose={close}
          title="Document actions"
          description={record.title}
        >
          <Button
            variant="ghost"
            theme="neutral"
            fullWidth
            onClick={() => {
              close();
              onOpen(record);
            }}
            leftIcon={<Icon name="document-text" size={20} />}
          >
            View Document
          </Button>
          <Button
            variant="ghost"
            theme="neutral"
            fullWidth
            disabled={!file}
            onClick={save}
            leftIcon={<Icon name="document-download" size={20} />}
          >
            Download Document
          </Button>
          <Button
            variant="ghost"
            theme="neutral"
            fullWidth
            disabled={!file}
            onClick={share}
            leftIcon={
              <Icon
                name="share-2"
                corner="rounded"
                variant="linear"
                family="essential"
                size={20}
              />
            }
          >
            Share Document
          </Button>
          {!file && <p role="status">{error || "Preparing document…"}</p>}
        </Sheet>
      </div>
      {line && (
        <span className={s.srOnly} id={statusId}>
          {line}
        </span>
      )}
    </article>
  );
}
