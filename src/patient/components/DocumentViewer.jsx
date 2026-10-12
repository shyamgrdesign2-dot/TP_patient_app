import { createPortal } from "react-dom";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useApp } from "../state/AppContext";
import { download } from "../services/files";
import { ErrorText, Icon } from "./ui";
import shared from "../App.module.css";
import s from "./DocumentViewer.module.css";
const PdfViewer = lazy(() => import("./PdfViewer"));

export default function DocumentViewer({
  file,
  error,
  record,
  label = "Document",
  portalControls = false,
  controlNames = { share: "Share", download: "Download file", print: "Print" },
  toolbarLabel = `${label} controls`,
}) {
  const { notify } = useApp();
  const [host, setHost] = useState(null);
  const [url, setUrl] = useState(null);
  const [pages, setPages] = useState(0);
  const pdf = useRef(null);
  const [printReady, setPrintReady] = useState(false);
  const onDocument = useCallback((document) => {
    pdf.current = document;
    setPrintReady(!!document);
  }, []);
  useEffect(() => setHost(document.getElementById("page-action")), []);
  useEffect(() => {
    setPages(0);
    setPrintReady(false);
    pdf.current = null;
    if (!file || file.type === "application/pdf") return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setPrintReady(true);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const fileName = record.uploaded
    ? record.fileName || record.title
    : `${record.title.replace(/\W+/g, "-")}.pdf`;
  async function share() {
    const attachment = new File([file], fileName, { type: file.type });
    try {
      if (navigator.canShare?.({ files: [attachment] }))
        await navigator.share({ files: [attachment], title: record.title });
      else {
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
  async function print() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("Allow pop-ups to open the print preview.", true);
      return;
    }
    try {
      const { printDocument } = await import("./PdfViewer");
      await printDocument(printWindow, {
        pdf: pdf.current,
        imageUrl: file?.type.startsWith("image/") ? url : null,
        title: record.title,
      });
    } catch (issue) {
      printWindow.close();
      notify(issue.message, true);
    }
  }
  const tools = (
    <div
      className={`${shared.documentBar} ${s.tools} ${portalControls ? s.portalTools : ""}`}
      role="toolbar"
      aria-label={toolbarLabel}
      data-record-tools
    >
      <button
        type="button"
        aria-label={controlNames.share}
        title="Share"
        disabled={!file}
        onClick={share}
      >
        <Icon
          name="share-2"
          corner="rounded"
          variant="linear"
          family="essential"
          size={20}
        />
      </button>
      <button
        type="button"
        aria-label={controlNames.download}
        title="Download"
        disabled={!file}
        onClick={() => download(fileName, file)}
      >
        <Icon name="document-download" size={20} />
      </button>
      <button
        type="button"
        aria-label={controlNames.print}
        title="Print"
        disabled={!printReady}
        onClick={print}
      >
        <Icon name="printer" size={20} />
      </button>
    </div>
  );
  return (
    <div className={s.root}>
      <div
        className={s.scroll}
        role="region"
        aria-label={`${label} viewer`}
        tabIndex={0}
      >
        {record.uploaded && record.note && (
          <section className={s.notes} aria-label="Notes">
            <h3>Notes</h3>
            <p>{record.note}</p>
          </section>
        )}
        <ErrorText>{error}</ErrorText>
        {!file && !error && <p role="status">Loading document…</p>}
        {file &&
          (file.type === "application/pdf" ? (
            <Suspense fallback={<p role="status">Preparing PDF viewer…</p>}>
              <PdfViewer
                blob={file}
                title={record.title}
                onDocument={onDocument}
                onPageCount={setPages}
              />
              {Array.from({ length: Math.max(0, pages - 1) }, (_, index) => (
                <PdfViewer
                  key={index}
                  blob={file}
                  title={record.title}
                  pageNumber={index + 2}
                />
              ))}
            </Suspense>
          ) : url ? (
            <img src={url} alt={record.title} className={shared.reportImage} />
          ) : null)}
      </div>
      {portalControls ? host && createPortal(tools, host) : tools}
    </div>
  );
}
