import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ErrorText } from "./ui";
import s from "../App.module.css";
GlobalWorkerOptions.workerSrc = worker;
// Page navigation is controlled by the parent so it can live in the
// floating document bar.
export default function PdfViewer({
  blob,
  title,
  onDocument,
  pageNumber = 1,
  onPageChange,
}) {
  const [pdf, setPdf] = useState(null),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [width, setWidth] = useState(320),
    [loading, setLoading] = useState(true);
  const frame = useRef(null),
    canvas = useRef(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let task,
      cancelled = false;
    setLoading(true);
    setError("");
    setPdf(null);
    onPageChange?.(1);
    blob
      .arrayBuffer()
      .then((data) => {
        if (cancelled) return;
        task = getDocument({
          data: new Uint8Array(data),
          isEvalSupported: false,
        });
        task.onPassword = () => {
          setError(
            "This PDF is password protected. Download it to open it with your password.",
          );
          setLoading(false);
        };
        return task.promise;
      })
      .then((doc) => {
        if (!doc || cancelled) return;
        setPdf(doc);
        onDocument?.(doc);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "This PDF could not be displayed. Download the original file to open it.",
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      onDocument?.(null);
      task?.destroy();
    };
  }, [blob, onDocument]);
  useEffect(() => {
    if (!pdf) return;
    let render,
      cancelled = false;
    setLoading(true);
    pdf
      .getPage(pageNumber)
      .then(async (page) => {
        if (cancelled) return;
        const viewport = page.getViewport({
          scale: Math.max(200, width) / page.getViewport({ scale: 1 }).width,
        });
        const pixelRatio = Math.min(devicePixelRatio || 1, 2);
        const node = canvas.current;
        node.width = Math.floor(viewport.width * pixelRatio);
        node.height = Math.floor(viewport.height * pixelRatio);
        node.style.width = `${viewport.width}px`;
        node.style.height = `${viewport.height}px`;
        render = page.render({
          canvasContext: node.getContext("2d"),
          viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await render.promise;
        if (cancelled) return;
        const contents = await page.getTextContent();
        if (!cancelled) {
          setText(contents.items.map((item) => item.str).join(" "));
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled && e.name !== "RenderingCancelledException") {
          setError(
            "Unable to render this page. Download the file to continue.",
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [pdf, pageNumber, width]);
  return (
    <div className={s.pdfViewer}>
      <ErrorText>{error}</ErrorText>
      {loading && !error && <p role="status">Loading document…</p>}
      <div className={s.pdfCanvasFrame} ref={frame}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${title}, page ${pageNumber}`}
        />
        <p className={s.srOnly}>{text}</p>
      </div>
    </div>
  );
}
export async function printDocument(printWindow, { pdf, imageUrl, title }) {
  if (!printWindow) throw new Error("Allow pop-ups to open the print preview.");
  if (!pdf && !imageUrl)
    throw new Error("Wait for the document to finish loading.");
  printWindow.document.title = title;
  const style = printWindow.document.createElement("style");
  style.textContent =
    "@page{margin:8mm}body{margin:0}img{display:block;width:100%;height:auto;break-after:page}img:last-child{break-after:auto}";
  printWindow.document.head.appendChild(style);
  const urls = [];
  if (pdf) {
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;
      urls.push(canvas.toDataURL("image/png"));
    }
  } else if (imageUrl) urls.push(imageUrl);
  for (const url of urls) {
    const img = printWindow.document.createElement("img");
    img.alt = title;
    img.src = url;
    printWindow.document.body.appendChild(img);
    await img.decode();
  }
  printWindow.focus();
  printWindow.print();
}
