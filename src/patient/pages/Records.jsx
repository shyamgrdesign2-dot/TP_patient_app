import MedicalRecordTile from "../components/MedicalRecordTile";
import { PrescriptionReader } from "../components/RecordDocuments";
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
import { analyzeReport, concerningSummary } from "../../shared/labAnalysis";
import {
  RECORD_TABS,
  CATEGORY,
  MEDICAL_RECORD_TYPES,
  HISTORY_SECTIONS,
  historyLine,
  tabFor,
  sortRecords,
} from "../services/records";
import { getFile, saveFile, download } from "../services/files";
import {
  Button,
  AbhaLogo,
  Badge,
  Icon,
  PageHeader,
  Field,
  ChoiceGroup,
  Empty,
  Sheet,
  Notice,
  Meta,
  useAction,
  ErrorText,
} from "../components/ui";
import { AbhaCardSheet, AbhaSyncSheet } from "../components/abha/Abha";
import { makeSamplePdf } from "../services/recordPdf";
const PdfViewer = lazy(() => import("../components/PdfViewer"));
import s from "../App.module.css";
import r from "./Records.module.css";

const TAB_ICONS = {
  visits: { name: "calendar-2", family: "time" },
  labs: { name: "microscope", family: "medical" },
  records: { name: "folder-2", family: "files" },
  discharge: { name: "hospital", family: "building" },
  certificates: { name: "shield-tick", family: "security" },
  history: { name: "health" },
};
const TYPE_ICONS = {
  Pathology: { name: "microscope", family: "medical" },
  Radiology: { name: "scan", family: "essential" },
  Prescription: { name: "note-2", family: "content-edit" },
  Other: { name: "document", family: "content-edit" },
};
const AI_DISCLAIMER =
  "This summary is generated automatically and is not a diagnosis. Please discuss your records with your doctor.";

// Who it came from, then when: "Dr. Meera Iyer | 5 Oct, 10:30 AM".
export function recordSource(r) {
  const doctor = doctors.find((d) => d.id === r.doctorId);
  const who = r.uploaded
    ? "Uploaded by you"
    : r.category === CATEGORY.prescription && doctor
      ? doctor.name
      : r.author || doctor?.name || "Hospital";
  const when = [formatDate(r.date), r.time].filter(Boolean).join(", ");
  return r.source === "abha" ? [who, "via ABHA", when] : [who, when];
}
const matches = (text, search) =>
  text.toLowerCase().includes(search.trim().toLowerCase());

export default function Records() {
  const { state, activeMember, dispatch, notify, brand } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = RECORD_TABS.some((t) => t.id === params.get("tab"))
    ? params.get("tab")
    : "visits";
  const setTab = (next) => {
    setSearch("");
    setAbhaOnly(false);
    setTypeFilter("All");
    const p = new URLSearchParams(params);
    if (next === "visits") p.delete("tab");
    else p.set("tab", next);
    p.delete("record");
    setParams(p, { replace: true });
  };
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [upload, setUpload] = useState(() => params.get("upload") === "1");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [fileType, setFileType] = useState("Pathology");
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
  const [discharge, setDischarge] = useState(null);
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
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const strip = tabStrip.current;
      const selectedTab = strip?.querySelector(
        '[role="tab"][aria-selected="true"]',
      );
      if (!strip || !selectedTab) return;
      const bounds = strip.getBoundingClientRect();
      const item = selectedTab.getBoundingClientRect();
      if (item.left < bounds.left + 16 || item.right > bounds.right - 16) {
        strip.scrollLeft +=
          item.left - bounds.left - (bounds.width - item.width) / 2;
      }
      updateTabFade();
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, activeMember.id, updateTabFade]);
  const { busy, error, run } = useAction();
  const records = state.records.filter(
    (r) =>
      r.memberId === activeMember.id &&
      r.released !== false &&
      (!abhaOnly || r.source === "abha"),
  );
  const selected = state.records.find(
    (r) =>
      r.id === params.get("record") &&
      r.memberId === activeMember.id &&
      r.released !== false,
  );
  const inTab = (category) =>
    sortRecords(records.filter((r) => r.category === category)).filter(
      (r) =>
        !search ||
        matches(
          `${r.title} ${r.author || ""} ${r.rx?.diagnosis || ""}`,
          search,
        ),
    );
  const prescriptions = inTab(CATEGORY.prescription);
  const labs = inTab(CATEGORY.lab);
  const medical = inTab(CATEGORY.medical);
  const typeCounts = Object.fromEntries(
    MEDICAL_RECORD_TYPES.map((t) => [
      t,
      medical.filter((r) => (r.type || "Other") === t).length,
    ]),
  );
  const medicalShown =
    typeFilter === "All"
      ? medical
      : medical.filter((r) => (r.type || "Other") === typeFilter);
  const discharges = inTab(CATEGORY.discharge);
  const certificates = inTab(CATEGORY.certificate);
  const count = {
    visits: prescriptions.length,
    labs: labs.length,
    records: medicalShown.length,
    discharge: discharges.length,
    certificates: certificates.length,
  }[tab];
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
  function openRecord(record) {
    if (
      (record.category === CATEGORY.lab && record.params?.length) ||
      (["Radiology", "Pathology"].includes(record.type) && record.summary)
    )
      navigate(`/records/${record.id}`);
    else {
      const p = new URLSearchParams(params);
      p.set("record", record.id);
      setParams(p);
    }
  }
  function closeRecord() {
    const p = new URLSearchParams(params);
    p.delete("record");
    setParams(p);
  }
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
          category: CATEGORY.medical,
          type: fileType,
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
      setTab("records");
      setTypeFilter("All");
      notify("Record saved.");
    });
  }
  const recordFileName = selected?.uploaded
    ? selected.fileName
    : `${selected?.title.replace(/\W+/g, "-")}.pdf`;
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
  const emptyCopy = {
    visits: {
      title: "No prescriptions yet",
      description:
        "Prescriptions from each completed visit appear here, with the doctor’s notes.",
      action: "Book appointment",
      onAction: () => navigate("/doctors"),
    },
    labs: {
      title: "No lab results yet",
      description:
        "Results from the hospital laboratory, or entered by your doctor, appear here with an intelligent analysis.",
    },
    records: {
      title:
        typeFilter === "All"
          ? "No medical records yet"
          : `No ${typeFilter.toLowerCase()} records`,
      description:
        "Reports and scans shared by your hospital appear here. You can add your own too.",
      action: [<Icon key="add" name="add" size={18} />, "Upload a record"],
      onAction: () => setUpload(true),
    },
    discharge: {
      title: "No discharge summaries",
      description:
        "A summary of each hospital stay appears here once you are discharged.",
    },
    certificates: {
      title: "No certificates yet",
      description:
        "Fitness, leave and travel certificates issued by your doctor appear here.",
    },
  }[tab];
  return (
    <div
      className={`${s.page} ${tab === "visits" ? r.prescriptionPage : ""}`}
      data-prescription-page={tab === "visits" || undefined}
    >
      <PageHeader
        title="Health records"
        patientSelector
        action={
          tab === "records" && (
            <Button
              className={r.uploadFloat}
              aria-label="Upload medical records"
              title="Upload medical records"
              onClick={() => setUpload(true)}
            >
              <Icon name="document-upload" size={20} />
              Upload medical records
            </Button>
          )
        }
      />
      <div className={`${s.recordsTop} ${r.recordsBand}`}>
        <div
          className={s.recordTabs}
          ref={tabStrip}
          onScroll={updateTabFade}
          data-fade-left={tabFade.left || undefined}
          data-fade-right={tabFade.right || undefined}
        >
          <Tabs value={tab} onValueChange={setTab} size="sm" variant="segment">
            <TabsList aria-label="Record type">
              {RECORD_TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  id={`records-tab-${t.id}`}
                  aria-controls="records-panel"
                  value={t.id}
                  leftIcon={
                    <Icon
                      name={TAB_ICONS[t.id].name}
                      family={TAB_ICONS[t.id].family}
                      corner="rounded"
                      bulk={tab === t.id}
                      size={16}
                    />
                  }
                >
                  {t.label}
                  {t.id !== "history"
                    ? ` (${records.filter((record) => tabFor(record) === t.id).length})`
                    : ""}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div
        role="tabpanel"
        id="records-panel"
        aria-labelledby={`records-tab-${tab}`}
        className={r.recordsPanel}
      >
        {tab !== "history" && tab !== "visits" && (
          <Field
            aria-label={`Search ${RECORD_TABS.find((t) => t.id === tab).label.toLowerCase()}`}
            placeholder={
              tab === "visits"
                ? "Search by doctor or diagnosis"
                : "Search by title or source"
            }
            leftIcon={<Icon name="search-normal" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        {tab === "records" && (
          <ChoiceGroup
            label="Record type"
            hideLabel
            options={[
              { value: "All", label: `All (${medical.length})` },
              ...MEDICAL_RECORD_TYPES.map((t) => ({
                value: t,
                label: `${t} (${typeCounts[t]})`,
              })),
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        )}
        {tab !== "history" && tab !== "visits" && (
          <div className={s.listMeta}>
            <span aria-live="polite">
              {count}{" "}
              {tab === "visits"
                ? count === 1
                  ? "prescription"
                  : "prescriptions"
                : count === 1
                  ? "record"
                  : "records"}
            </span>
            {abhaOnly && (
              <button
                className={s.filterPill}
                onClick={() => setAbhaOnly(false)}
              >
                From ABHA
                <Icon name="close" size={14} />
              </button>
            )}
          </div>
        )}
        {tab === "visits" && (
          <PrescriptionReader
            key={activeMember.id}
            records={prescriptions}
            onOpen={openRecord}
          />
        )}
        {tab === "labs" && (
          <div className={r.documentGrid}>
            {labs.map((record) => (
              <MedicalRecordTile
                key={record.id}
                record={record}
                onOpen={openRecord}
                line={<LabLine record={record} />}
              />
            ))}
          </div>
        )}
        {tab === "records" && (
          <>
            <div className={r.documentGrid}>
              {medicalShown.map((record) => (
                <MedicalRecordTile
                  key={record.id}
                  record={record}
                  onOpen={openRecord}
                />
              ))}
            </div>
          </>
        )}
        {tab === "records" &&
          (abhaLink ? (
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
          ))}
        {tab === "discharge" && (
          <div className={r.documentGrid}>
            {discharges.map((record) => (
              <MedicalRecordTile
                key={record.id}
                record={record}
                line={
                  record.discharge && (
                    <span className={r.line}>
                      {record.discharge.ward} ·{" "}
                      {formatDate(record.discharge.admitted)} to{" "}
                      {formatDate(record.discharge.discharged)}
                    </span>
                  )
                }
                onOpen={() =>
                  record.discharge ? setDischarge(record) : openRecord(record)
                }
              />
            ))}
          </div>
        )}
        {tab === "certificates" && (
          <div className={r.documentGrid}>
            {certificates.map((record) => (
              <MedicalRecordTile
                key={record.id}
                record={record}
                line={
                  record.certificate?.from && (
                    <span className={r.line}>
                      Valid {formatDate(record.certificate.from)} to{" "}
                      {formatDate(record.certificate.to)}
                    </span>
                  )
                }
                onOpen={() => openRecord(record)}
              />
            ))}
          </div>
        )}
        {tab === "history" && <MedicalHistory member={activeMember} />}
        {tab !== "history" && !count && (
          <Empty
            icon={
              TAB_ICONS[tab].name === "microscope"
                ? "document-text"
                : TAB_ICONS[tab].name
            }
            title={search ? "Nothing matches your search" : emptyCopy.title}
            description={
              search ? "Try a different search or tab." : emptyCopy.description
            }
            action={search ? "Clear search" : emptyCopy.action}
            onAction={search ? () => setSearch("") : emptyCopy.onAction}
          />
        )}
      </div>
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
              setAbhaSheet(null);
            }}
          />
          <AbhaSyncSheet
            open={abhaSheet === "sync"}
            onClose={() => setAbhaSheet(null)}
            member={activeMember}
            onDone={() => setAbhaOnly(true)}
          />
        </>
      )}
      <DischargeSheet
        record={discharge}
        onClose={() => setDischarge(null)}
        onOpenPdf={(record) => {
          setDischarge(null);
          openRecord(record);
        }}
      />
      <Sheet
        open={!!selected}
        onClose={closeRecord}
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
              aria-label="Download file"
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
        title="Add a medical record"
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
            label="Record type"
            options={MEDICAL_RECORD_TYPES}
            value={fileType}
            onChange={setFileType}
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

// Lab result status under the title: what needs attention, if anything.
function LabLine({ record }) {
  if (!record.params?.length) return null;
  const { concerning } = analyzeReport(record);
  return (
    <span className={r.line} data-tone={concerning.length ? "alert" : "ok"}>
      {concerningSummary(concerning.length)}
    </span>
  );
}

function DischargeSheet({ record, onClose, onOpenPdf }) {
  const d = record?.discharge;
  return (
    <Sheet
      open={!!record}
      onClose={onClose}
      title="Discharge summary"
      description={d && d.ward}
    >
      {d && (
        <>
          <div className={r.stayRow}>
            <div className={r.stay}>
              <small>Admitted</small>
              <strong>{formatDate(d.admitted, { year: "numeric" })}</strong>
            </div>
            <div className={r.stay}>
              <small>Discharged</small>
              <strong>{formatDate(d.discharged, { year: "numeric" })}</strong>
            </div>
          </div>
          <div className={r.rxGrid}>
            <div className={r.rxBlock} data-tone="brand">
              <small>Diagnosis</small>
              <p>{d.diagnosis}</p>
            </div>
            {d.procedures?.length > 0 && (
              <div className={r.rxBlock}>
                <small>Procedures</small>
                <p>{d.procedures.join(" · ")}</p>
              </div>
            )}
            {d.course && (
              <div className={r.rxBlock}>
                <small>Hospital course</small>
                <p>{d.course}</p>
              </div>
            )}
            {d.medicines?.length > 0 && (
              <>
                <h3 className={r.subhead}>Medicines on discharge</h3>
                <ol className={r.medicines}>
                  {d.medicines.map(([name, dose, when, days], i) => (
                    <li key={name}>
                      <span aria-hidden="true">{i + 1}</span>
                      <span className={r.grow}>
                        <strong>{name}</strong>
                        <small>
                          {[dose, when, days].filter(Boolean).join(" · ")}
                        </small>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {d.advice && (
              <div className={r.rxBlock}>
                <small>Advice</small>
                <p>{d.advice}</p>
              </div>
            )}
            {d.followUp && (
              <div className={r.rxBlock}>
                <small>Follow-up</small>
                <p>{d.followUp}</p>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            theme="neutral"
            fullWidth
            onClick={() => onOpenPdf(record)}
          >
            <Icon name="document-text" size={18} />
            Open full document
          </Button>
        </>
      )}
    </Sheet>
  );
}

// What the hospital knows about the patient: conditions, allergies,
// medications, surgeries, vaccinations and family history.
function MedicalHistory({ member }) {
  const history = member.history || {};
  const total = HISTORY_SECTIONS.reduce(
    (n, sec) => n + (history[sec.key]?.length || 0),
    0,
  );
  if (!total && !history.lifestyle)
    return (
      <Empty
        icon="health"
        title="No medical history yet"
        description="Your doctor records medical conditions, allergies and health history during your visits."
      />
    );
  return (
    <div className={r.history}>
      {HISTORY_SECTIONS.map((sec) => {
        const value = history[sec.key];
        const items = Array.isArray(value) ? value : value ? [value] : [];
        return (
          <section
            key={sec.key}
            className={r.historySection}
            aria-label={sec.label}
          >
            <div className={r.historyHead}>
              <Icon name={sec.icon} size={20} bulk />
              <h2>{sec.label}</h2>
            </div>
            {items.length ? (
              <ul className={r.historyList}>
                {items.map((item, i) => (
                  <li key={i}>
                    {historyLine(sec.key, item).filter(Boolean).join(" · ")}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={r.historyEmpty}>
                {sec.key === "allergies"
                  ? "No allergy information recorded."
                  : "Nothing recorded."}
              </p>
            )}
          </section>
        );
      })}
      <Notice icon="info-circle">
        Recorded by your doctors during visits. Tell your doctor if anything
        here has changed.
      </Notice>
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
