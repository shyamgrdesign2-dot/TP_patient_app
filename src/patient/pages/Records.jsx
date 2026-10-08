import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useCallback,
  useState,
} from "react";
import { Tabs, TabsList, TabsTrigger } from "@dhspl-tatvacare/tesseract-ui";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { formatDate, dateKey, doctors } from "../../shared/data";
import { getFile, saveFile, download } from "../services/files";
import {
  Button,
  IconButton,
  AbhaLogo,
  Badge,
  Icon,
  PageHeader,
  MemberContext,
  Field,
  ChoiceGroup,
  Empty,
  Sheet,
  Notice,
  ErrorText,
  Tag,
  useAction,
} from "../components/ui";
import { AbhaCardSheet, AbhaSyncSheet } from "../components/abha/Abha";
import { makeSamplePdf } from "../services/recordPdf";
const PdfViewer = lazy(() => import("../components/PdfViewer"));
import s from "../App.module.css";
const categories = [
  "All records",
  "Prescriptions",
  "Lab reports",
  "Scans & imaging",
  "Discharge summaries",
  "Other documents",
];
// Category icons, shown in the tabs and (bulk) on each record.
const CATEGORY_ICONS = {
  "All records": { name: "folder-2", family: "files" },
  Prescriptions: { name: "note-2", family: "content-edit" },
  "Lab reports": { name: "microscope", family: "medical" },
  "Scans & imaging": { name: "scan", family: "essential" },
  "Discharge summaries": { name: "hospital", family: "building" },
  "Other documents": { name: "document", family: "content-edit" },
  other: { name: "document", family: "content-edit" },
};
const UPLOAD_LABEL = {
  "All records": "Upload a record",
  Prescriptions: "Upload a prescription",
  "Lab reports": "Upload a lab report",
  "Scans & imaging": "Upload a scan",
  "Discharge summaries": "Upload a discharge summary",
  "Other documents": "Upload a document",
};
// Who it came from, then when: "Dr. Meera Iyer · 5 Oct, 10:30 AM".
function recordSource(r) {
  const doctor = doctors.find((d) => d.id === r.doctorId);
  const who = r.uploaded
    ? "Uploaded by you"
    : r.category === "Prescriptions" && doctor
      ? doctor.name
      : r.author || doctor?.name || "Hospital";
  const when = [formatDate(r.date), r.time].filter(Boolean).join(", ");
  return r.source === "abha"
    ? `${who} · via ABHA · ${when}`
    : `${who} · ${when}`;
}
export default function Records() {
  const { state, activeMember, dispatch, notify, brand } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All records");
  const [upload, setUpload] = useState(() => params.get("upload") === "1");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [fileCategory, setFileCategory] = useState("Lab reports");
  const [fileDate, setFileDate] = useState(dateKey());
  const [fileUrl, setFileUrl] = useState(null);
  const [recordBlob, setRecordBlob] = useState(null);
  const pdfDocument = useRef(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const setPdfDocument = useCallback((doc) => {
    pdfDocument.current = doc;
    setPdfReady(!!doc);
    setPageCount(doc?.numPages || 0);
  }, []);
  const [fileError, setFileError] = useState("");
  const [about, setAbout] = useState(false);
  const [abhaSheet, setAbhaSheet] = useState(() =>
    params.get("abha") === "card" ? "card" : null,
  );
  const [abhaOnly, setAbhaOnly] = useState(false);
  const abhaLink = state.healthLinks?.[activeMember.id]?.abha;
  // Edge fades show only on the side that still has tabs to scroll to.
  const tabStrip = useRef(null);
  const [tabFade, setTabFade] = useState({ left: false, right: false });
  const updateTabFade = useCallback(() => {
    const n = tabStrip.current;
    if (!n) return;
    setTabFade({
      left: n.scrollLeft > 2,
      right: n.scrollLeft + n.clientWidth < n.scrollWidth - 2,
    });
  }, []);
  useEffect(() => {
    updateTabFade();
    window.addEventListener("resize", updateTabFade);
    return () => window.removeEventListener("resize", updateTabFade);
  }, [updateTabFade]);
  const { busy, error, run } = useAction();
  const records = state.records.filter((r) => r.memberId === activeMember.id);
  const selected = records.find((r) => r.id === params.get("record"));
  const filtered = records.filter(
    (r) =>
      (!abhaOnly || r.source === "abha") &&
      (category === "All records" || r.category === category) &&
      `${r.title} ${r.author}`.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    let url;
    let cancelled = false;
    setFileUrl(null);
    setRecordBlob(null);
    setFileError("");
    setPdfReady(false);
    if (selected)
      (selected.uploaded
        ? getFile(selected.id)
        : makeSamplePdf(selected, activeMember, brand)
      )
        .then((blob) => {
          if (cancelled) return;
          if (!blob) {
            setFileError(
              "The local file is no longer available in this browser. Please upload it again.",
            );
            return;
          }
          url = URL.createObjectURL(blob);
          setFileUrl(url);
          setRecordBlob(blob);
        })
        .catch(() =>
          setFileError(
            "Could not load the file. Close this panel and try again.",
          ),
        );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [selected?.id]);
  function uploadRecord(e) {
    e.preventDefault();
    run(async () => {
      if (!file) throw new Error("Choose a PDF, PNG or JPEG file.");
      if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type))
        throw new Error("Use a PDF, PNG or JPEG file.");
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Choose a file smaller than 10 MB.");
      if (!title.trim()) throw new Error("Give this record a title.");
      if (!fileDate || fileDate > dateKey())
        throw new Error("Choose today or a past record date.");
      const id = crypto.randomUUID();
      await saveFile(id, file);
      dispatch({
        type: "RECORD",
        record: {
          id,
          memberId: activeMember.id,
          title: title.trim(),
          category: fileCategory,
          date: fileDate,
          author: "Uploaded by you",
          format: file.type === "application/pdf" ? "PDF" : "Image",
          uploaded: true,
          fileName: file.name,
          mime: file.type,
        },
      });
      setUpload(false);
      setFile(null);
      setTitle("");
      notify("Record saved.");
    });
  }
  const recordFileName = selected?.uploaded
    ? selected.fileName
    : `${selected?.title.replace(/\W+/g, "-")}-sample.pdf`;
  function downloadRecord() {
    if (recordBlob) {
      download(recordFileName, recordBlob);
      notify("Download started.");
    }
  }
  async function shareRecord() {
    if (!recordBlob) return;
    const file = new File([recordBlob], recordFileName, {
      type: recordBlob.type,
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: selected.title });
      } catch (error) {
        if (error.name !== "AbortError")
          notify(
            "Sharing could not start. Download the file to share it.",
            true,
          );
      }
    } else {
      downloadRecord();
      notify(
        "File downloaded. Share it from your device’s Files or Downloads app.",
      );
    }
  }
  async function printRecord() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("Allow pop-ups to open the print preview.", true);
      return;
    }
    try {
      const { printDocument } = await import("../components/PdfViewer");
      await printDocument(printWindow, {
        pdf: pdfDocument.current,
        imageUrl: recordBlob?.type.startsWith("image/") ? fileUrl : null,
        title: selected.title,
      });
    } catch (error) {
      printWindow.close();
      notify(error.message, true);
    }
  }
  return (
    <div className={s.page}>
      <PageHeader
        title="Health records"
        trailing={
          <IconButton
            name="info-circle"
            variant="ghost"
            theme="neutral"
            iconColor="var(--tesseract-fg-secondary)"
            label="About health records"
            onClick={() => setAbout(true)}
          />
        }
        action={
          filtered.length > 0 && (
            <Button size="md" onClick={() => setUpload(true)}>
              <Icon name="document-upload" size={18} />
              Upload document
            </Button>
          )
        }
      />
      <div className={s.recordsTop}>
        <MemberContext plain />
        <div
          className={s.recordTabs}
          ref={tabStrip}
          onScroll={updateTabFade}
          data-fade-left={tabFade.left || undefined}
          data-fade-right={tabFade.right || undefined}
        >
          <Tabs value={category} onValueChange={setCategory} size="sm">
            <TabsList aria-label="Record type">
              {categories.map((c) => (
                <TabsTrigger
                  key={c}
                  value={c}
                  leftIcon={
                    <Icon
                      name={CATEGORY_ICONS[c].name}
                      family={CATEGORY_ICONS[c].family}
                      corner="rounded"
                      bulk={category === c}
                      size={16}
                    />
                  }
                >
                  {c}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <Field
        aria-label="Search health records"
        placeholder="Search reports, prescriptions..."
        leftIcon={<Icon name="search-normal" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {abhaLink ? (
        <div className={s.abhaRow}>
          <button
            className={s.abhaRowMain}
            onClick={() => setAbhaSheet("card")}
            aria-label={`ABHA ${abhaLink.address || ""}. View ABHA card`}
          >
            <AbhaLogo linked />
            <span className={s.grow}>
              <strong>{abhaLink.address || "ABHA linked"}</strong>
              <small>
                {abhaLink.autoSync
                  ? "Auto-sync on"
                  : abhaLink.lastSyncAt
                    ? `Last synced ${formatDate(abhaLink.lastSyncAt.slice(0, 10))}`
                    : "Not synced yet"}
              </small>
            </span>
          </button>
          <button
            className={s.abhaRowSync}
            onClick={() => setAbhaSheet("sync")}
          >
            <Icon name="rotate-right" family="arrow" size={16} />
            Sync
          </button>
        </div>
      ) : (
        <button
          className={s.linkRecordsBanner}
          onClick={() => navigate("/link-records")}
        >
          <span className={s.rowIcon}>
            <AbhaLogo />
          </span>
          <span className={s.grow}>
            <strong>Link your health records</strong>
            <small>Connect with your UHID or ABHA</small>
          </span>
          <Icon name="chevron-right" size={18} />
        </button>
      )}
      <div className={s.listMeta}>
        <span>
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
        </span>
        {abhaOnly && (
          <button className={s.filterPill} onClick={() => setAbhaOnly(false)}>
            From ABHA
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      <div className={s.stack}>
        {filtered.map((r) => (
          <button
            key={r.id}
            className={s.recordCard}
            onClick={() => setParams({ record: r.id })}
          >
            <span className={s.documentIcon} data-category={r.category}>
              <Icon
                name={(CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other).name}
                family={
                  (CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other).family
                }
                corner="rounded"
                bulk
                size={22}
              />
            </span>
            {category === categories[0] && (
              <span className={s.cornerTag}>{r.category}</span>
            )}
            <span className={s.grow}>
              <span className={s.recordTitle}>
                <span className={s.rowTitle}>{r.title}</span>
                {r.new && (
                  <Badge variant="soft" color="primary" size="sm">
                    New
                  </Badge>
                )}
              </span>
              <span className={s.metaText}>{recordSource(r)}</span>
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          icon={(CATEGORY_ICONS[category] || CATEGORY_ICONS.other).name}
          title={
            search
              ? "No matching records"
              : category === "All records"
                ? "No records here yet"
                : `No ${category.toLowerCase()} yet`
          }
          description={
            search
              ? "Try a different search or category."
              : "Records shared by your hospital will appear here. You can add your own too."
          }
          action={
            search
              ? "Clear search"
              : [
                  <Icon key="add" name="add" size={18} />,
                  UPLOAD_LABEL[category],
                ]
          }
          onAction={() => (search ? setSearch("") : setUpload(true))}
        />
      )}
      {abhaLink && (
        <>
          <AbhaCardSheet
            open={abhaSheet === "card"}
            onClose={() => setAbhaSheet(null)}
            member={activeMember}
            link={abhaLink}
            onSync={() => setAbhaSheet("sync")}
            onView={() => {
              setAbhaOnly(true);
              setCategory("All records");
              setAbhaSheet(null);
            }}
          />
          <AbhaSyncSheet
            open={abhaSheet === "sync"}
            onClose={() => setAbhaSheet(null)}
            member={activeMember}
            onDone={() => {
              setAbhaOnly(true);
              setCategory("All records");
            }}
          />
        </>
      )}
      <Sheet
        open={about}
        onClose={() => setAbout(false)}
        title="About health records"
      >
        <Notice icon="lock">
          Your records are organised by family member. Switching profiles
          changes the records you see.
        </Notice>
        <p className={s.metaText}>
          Reports, prescriptions and scans shared by your hospital appear here
          automatically. You can also upload your own documents.
        </p>
      </Sheet>
      <Sheet
        open={!!selected}
        onClose={() => setParams({})}
        title={selected?.title || "Health record"}
        documentView
        headerIcon="document-text"
        description={selected && formatDate(selected.date, { year: "numeric" })}
        footer={
          <DocumentBar
            page={pdfPage}
            pages={recordBlob?.type === "application/pdf" ? pageCount : 0}
            onPage={setPdfPage}
          >
            <button
              type="button"
              aria-label="Share"
              title="Share"
              onClick={shareRecord}
              disabled={!recordBlob}
            >
              <Icon name="share-2" size={20} />
            </button>
            <button
              type="button"
              aria-label={
                selected?.uploaded ? "Download file" : "Download sample record"
              }
              title="Download"
              onClick={downloadRecord}
              disabled={!recordBlob}
            >
              <Icon name="document-download" size={20} />
            </button>
            <button
              type="button"
              aria-label="Print"
              title="Print"
              onClick={printRecord}
              disabled={
                !recordBlob ||
                !!fileError ||
                (recordBlob.type === "application/pdf" && !pdfReady)
              }
            >
              <Icon name="printer" size={20} />
            </button>
          </DocumentBar>
        }
      >
        <ErrorText>{fileError}</ErrorText>
        {!recordBlob && !fileError && <p role="status">Loading document…</p>}
        {recordBlob &&
          (recordBlob.type === "application/pdf" ? (
            <Suspense fallback={<p role="status">Preparing PDF viewer…</p>}>
              <PdfViewer
                blob={recordBlob}
                title={selected?.title}
                onDocument={setPdfDocument}
                pageNumber={pdfPage}
                onPageChange={setPdfPage}
              />
            </Suspense>
          ) : (
            <img
              src={fileUrl}
              alt={selected?.title}
              className={s.reportImage}
            />
          ))}
      </Sheet>
      <Sheet
        open={upload}
        documentView
        headerIcon="document-upload"
        onClose={() => setUpload(false)}
        title="Add a health record"
        description={`Save a record to ${activeMember.name}’s profile.`}
      >
        <form className={s.stack} onSubmit={uploadRecord}>
          <label className={s.uploadZone}>
            <Icon name="document-upload" size={32} />
            <strong>{file ? file.name : "Choose a file"}</strong>
            <small>PDF, JPG or PNG · Up to 10 MB</small>
            <input
              aria-label="Record file"
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => {
                const f = e.target.files[0];
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
          </label>
          <Field
            label="Record title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <ChoiceGroup
            label="Record category"
            options={categories.slice(1)}
            value={fileCategory}
            onChange={setFileCategory}
          />
          <Field
            label="Record date"
            type="date"
            required
            max={dateKey()}
            value={fileDate}
            onChange={(e) => setFileDate(e.target.value)}
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={busy} fullWidth>
            Save record
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

// Floating, translucent document controls: page switch and icon actions.
// Hides while the document scrolls and returns once scrolling stops.
function DocumentBar({ page, pages, onPage, children }) {
  const bar = useRef(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const scroller = bar.current
      ?.closest('[role="dialog"]')
      ?.querySelector(`.${s.sheetBody}`);
    if (!scroller) return;
    let idle;
    const onScroll = () => {
      setHidden(true);
      clearTimeout(idle);
      idle = setTimeout(() => setHidden(false), 700);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(idle);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, []);
  return (
    <div className={s.documentBar} ref={bar} data-hidden={hidden}>
      {pages > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous PDF page"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <span className={s.documentBarPage} aria-live="polite">
            {page} / {pages}
          </span>
          <button
            type="button"
            aria-label="Next PDF page"
            disabled={page >= pages}
            onClick={() => onPage(page + 1)}
          >
            <Icon name="chevron-right" size={18} />
          </button>
          <span className={s.documentBarDivider} aria-hidden="true" />
        </>
      )}
      {children}
    </div>
  );
}
