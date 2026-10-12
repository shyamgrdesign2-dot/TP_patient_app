import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Sheet, Button, Icon, ErrorText } from "./ui";
import { useApp } from "../state/AppContext";
import { getFile, download } from "../services/files";
import { makeSamplePdf } from "../services/recordPdf";
const PdfViewer = lazy(() => import("./PdfViewer"));
export default function VisitDocumentSheet({ document, onClose }) {
  const { activeMember, brand } = useApp();
  const [blob, setBlob] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const onDocument = useCallback((pdf) => setPages(pdf?.numPages || 0), []);
  useEffect(() => {
    let cancelled = false;
    setBlob(null);
    setError("");
    setPage(1);
    setPages(0);
    if (document) {
      const task = document.uploaded
        ? getFile(document.id)
        : makeSamplePdf(document, activeMember, brand);
      task
        .then((file) => {
          if (cancelled) return;
          if (!file)
            throw new Error(
              "The original file is unavailable. Please ask the hospital to share it again.",
            );
          setBlob(file);
        })
        .catch((e) => {
          if (!cancelled)
            setError(e.message || "Could not load this document.");
        });
    }
    return () => {
      cancelled = true;
    };
  }, [document, activeMember.id, brand]);
  return (
    <Sheet
      open={!!document}
      onClose={onClose}
      title={document?.bill ? "Bill PDF" : "Prescription PDF"}
      documentView
      footer={
        blob &&
        document && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Button
              variant="ghost"
              disabled={page <= 1}
              aria-label="Previous PDF page"
              onClick={() => setPage(page - 1)}
            >
              <Icon name="chevron-left" />
            </Button>
            <span aria-live="polite">
              {page} / {pages || "…"}
            </span>
            <Button
              variant="ghost"
              disabled={page >= pages}
              aria-label="Next PDF page"
              onClick={() => setPage(page + 1)}
            >
              <Icon name="chevron-right" />
            </Button>
            <Button
              variant="tonal"
              onClick={() => download(`${document.id}.pdf`, blob)}
            >
              <Icon name="document-download" />
              Download
            </Button>
          </div>
        )
      }
    >
      <ErrorText>{error}</ErrorText>
      {!blob && !error && <p role="status">Loading document…</p>}
      {blob && document && (
        <Suspense fallback={<p role="status">Loading PDF…</p>}>
          <PdfViewer
            blob={blob}
            title={document.title}
            onDocument={onDocument}
            pageNumber={page}
            onPageChange={setPage}
          />
        </Suspense>
      )}
    </Sheet>
  );
}
