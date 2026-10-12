import { createPortal } from "react-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useApp } from "../state/AppContext";
import { makeSamplePdf } from "../services/recordPdf";
import { download, getFile } from "../services/files";
import { formatDate } from "../../shared/data";
import { Button, Icon, ErrorText } from "./ui";
import shared from "../App.module.css";
import r from "../pages/Records.module.css";
const PdfViewer = lazy(() => import("./PdfViewer"));
function useRecordFile(record) {
  const { activeMember, brand } = useApp();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setFile(null);
    setError("");
    if (record)
      (record.uploaded
        ? getFile(record.id)
        : makeSamplePdf(record, activeMember, brand)
      )
        .then((blob) => {
          if (!cancelled) {
            if (blob) setFile(blob);
            else setError("Original file unavailable. Please upload it again.");
          }
        })
        .catch(() => {
          if (!cancelled) setError("Could not load this document.");
        });
    return () => {
      cancelled = true;
    };
  }, [record?.id, activeMember.id, brand]);
  return { file, error };
}
export function PrescriptionReader({ records }) {
  const { notify } = useApp();
  const [host, setHost] = useState(null);
  useEffect(() => setHost(document.getElementById("page-action")), []);
  const [selectedId, setSelectedId] = useState(records[0]?.id);
  const index = Math.max(
    0,
    records.findIndex((r) => r.id === selectedId),
  );
  const record = records[index];
  const { file, error } = useRecordFile(record);
  const [pages, setPages] = useState(0);
  async function sharePrescription() {
    if (!file) return;
    const sharedFile = new File([file], `${record.title}.pdf`, {
      type: "application/pdf",
    });
    try {
      if (navigator.canShare?.({ files: [sharedFile] })) {
        await navigator.share({ files: [sharedFile], title: record.title });
      } else {
        download(sharedFile.name, file);
        notify(
          "File downloaded. Share it from your device’s Files or Downloads app.",
        );
      }
    } catch (error) {
      if (error.name !== "AbortError")
        notify("Sharing could not start. Download the file to share it.", true);
    }
  }
  if (!record) return null;
  return (
    <section className={r.prescriptionReader} aria-label="Your prescription">
      <div className={r.visitDateNav}>
        <Button
          variant="ghost"
          aria-label="Previous prescription"
          disabled={index >= records.length - 1}
          onClick={() => setSelectedId(records[index + 1].id)}
        >
          <Icon name="chevron-left" />
        </Button>
        <label className={r.datePicker}>
          <Icon name="calendar-2" size={16} />
          <span aria-hidden="true">
            {formatDate(record.date, { year: "numeric" })}
            {record.time ? ` · ${record.time}` : ""}
          </span>
          <Icon name="chevron-down" size={14} />
          <select
            aria-label="Prescription date"
            value={record.id}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {records.map((rx) => (
              <option key={rx.id} value={rx.id}>
                {formatDate(rx.date, { year: "numeric" })}
                {rx.time ? ` · ${rx.time}` : ""}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          aria-label="Next prescription"
          disabled={index === 0}
          onClick={() => setSelectedId(records[index - 1].id)}
        >
          <Icon name="chevron-right" />
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
      {!file && !error && <p role="status">Loading prescription…</p>}
      {file && (
        <div
          className={r.inlinePdf}
          role="region"
          aria-label="Prescription document viewer"
          tabIndex={0}
          key={record.id}
        >
          <Suspense fallback={<p>Loading prescription…</p>}>
            <PdfViewer
              blob={file}
              title={record.title}
              onPageCount={setPages}
            />
            {Array.from({ length: Math.max(0, pages - 1) }, (_, i) => (
              <PdfViewer
                key={`${record.id}-${i}`}
                blob={file}
                title={record.title}
                pageNumber={i + 2}
              />
            ))}
          </Suspense>
        </div>
      )}
      {host &&
        createPortal(
          <div
            className={`${shared.floatingAction} ${r.readerTools}`}
            data-record-tools
            role="toolbar"
            aria-label="Prescription PDF controls"
          >
            <Button
              variant="ghost"
              disabled={!file}
              theme="neutral"
              aria-label="Download prescription"
              onClick={() => download(`${record.title}.pdf`, file)}
            >
              <Icon name="document-download" />
            </Button>
            <span className={r.toolDivider} aria-hidden="true" />
            <Button
              variant="ghost"
              theme="neutral"
              disabled={!file}
              aria-label="Share prescription"
              onClick={sharePrescription}
            >
              <Icon
                name="share-2"
                corner="rounded"
                variant="linear"
                family="essential"
                size={18}
              />
            </Button>
          </div>,
          host,
        )}
    </section>
  );
}
export function RecordThumbnail({ record }) {
  const { file } = useRecordFile(record);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file || file.type === "application/pdf") return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className={r.thumbnail} aria-hidden="true">
      {file?.type === "application/pdf" ? (
        <Suspense fallback={<Icon name="document-text" size={36} />}>
          <PdfViewer blob={file} title={record.title} />
        </Suspense>
      ) : url ? (
        <img src={url} alt="" />
      ) : (
        <Icon name="document-text" size={36} />
      )}
    </div>
  );
}
