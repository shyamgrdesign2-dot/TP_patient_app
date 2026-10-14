import DocumentViewer from "./DocumentViewer";
import { lazy, Suspense, useEffect, useState } from "react";
import { useApp } from "../state/AppContext";
import { makeSamplePdf } from "../services/recordPdf";
import { getFile } from "../services/files";
import { formatDate } from "../../shared/data";
import { Button, Icon } from "./ui";
import r from "../pages/Records.module.css";
const PdfViewer = lazy(() => import("./PdfViewer"));
export function useRecordFile(record) {
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
  const [selectedId, setSelectedId] = useState(records[0]?.id);
  const index = Math.max(
    0,
    records.findIndex((r) => r.id === selectedId),
  );
  const record = records[index];
  const { file, error } = useRecordFile(record);
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
      <DocumentViewer
        key={record.id}
        record={record}
        file={file}
        error={error}
        label="Prescription document"
        toolbarLabel="Prescription PDF controls"
        controlNames={{
          share: "Share prescription",
          download: "Download prescription",
          print: "Print prescription",
        }}
        portalControls
      />
    </section>
  );
}
export function RecordThumbnail({ record }) {
  const { file, error } = useRecordFile(record);
  return <FileThumbnail file={file} error={error} title={record.title} />;
}
// Shared local preview for saved records and unsaved upload drafts.
export function FileThumbnail({ file, error, title }) {
  const [url, setUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    setUrl(null);
    setLoaded(false);
    setImageError(false);
    if (!file || file.type === "application/pdf") return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div
      className={r.thumbnail}
      aria-hidden="true"
      data-loading={
        !error &&
        !imageError &&
        (!file || (file.type !== "application/pdf" && !loaded))
      }
    >
      {file?.type === "application/pdf" ? (
        <Suspense fallback={<span data-loading="true" />}>
          <PdfViewer blob={file} title={title} />
        </Suspense>
      ) : url && !imageError ? (
        <img
          src={url}
          alt=""
          onLoad={() => setLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : (
        <Icon name="document-text" size={36} />
      )}
    </div>
  );
}
