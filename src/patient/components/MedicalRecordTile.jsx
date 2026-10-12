import { useEffect, useId, useRef, useState } from "react";
import { useApp } from "../state/AppContext";
import { getFile, download } from "../services/files";
import { makeSamplePdf } from "../services/recordPdf";
import { formatDate } from "../../shared/data";
import { RecordThumbnail } from "./RecordDocuments";
import { AiSpark } from "./AiNote";
import { Icon } from "./ui";
import s from "./MedicalRecordTile.module.css";

export default function MedicalRecordTile({ record, onOpen, line }) {
  const { activeMember, brand, notify } = useApp();
  const disclosure = useRef(null);
  const statusLine = useRef(null);
  const analysisId = useId();
  const statusId = useId();
  const category = record.type || record.category || "Document";
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
    if (statusLine.current)
      statusLine.current.title = statusLine.current.textContent || "";
  }, [line]);

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

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!disclosure.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [open]);

  function close(restoreFocus = false) {
    if (!disclosure.current) return;
    disclosure.current.open = false;
    if (restoreFocus) disclosure.current.querySelector("summary").focus();
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
          <span className={s.category} title={category}>
            {category}
          </span>
          <time dateTime={record.date}>{formatDate(record.date)}</time>
        </div>
        <details
          className={s.actions}
          ref={disclosure}
          onToggle={(event) => setOpen(event.currentTarget.open)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close(true);
            }
          }}
        >
          <summary aria-label={`Actions for ${record.title}`}>
            <span className={s.dots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </summary>
          <div
            className={s.popover}
            role="group"
            aria-label={`Document actions for ${record.title}`}
          >
            <button
              type="button"
              onClick={() => {
                close();
                onOpen(record);
              }}
            >
              <Icon name="document-text" size={18} /> View
            </button>
            <button type="button" disabled={!file} onClick={save}>
              <Icon name="document-download" size={18} /> Download
            </button>
            <button type="button" disabled={!file} onClick={share}>
              <Icon
                name="share-2"
                corner="rounded"
                variant="linear"
                family="essential"
                size={18}
              />{" "}
              Share
            </button>
            {!file && <p role="status">{error || "Preparing document…"}</p>}
          </div>
        </details>
      </div>
      <div
        className={s.statusLine}
        id={line ? statusId : undefined}
        ref={statusLine}
        aria-hidden={!line || undefined}
      >
        {line}
      </div>
    </article>
  );
}
