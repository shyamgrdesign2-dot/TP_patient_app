import BrandHeaderPattern from "../components/BrandHeaderPattern";
import MedicalRecordTile from "../components/MedicalRecordTile";
import { useEffect, useRef, useCallback, useState } from "react";
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
import { saveFile } from "../services/files";
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
import { ReportSheet } from "./LabReport";
import s from "../App.module.css";
import r from "./Records.module.css";
import banner from "../components/BrandHeader.module.css";

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
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = RECORD_TABS.some((t) => t.id === params.get("tab"))
    ? params.get("tab")
    : "records";
  const setTab = (next) => {
    setSearch("");
    setAbhaOnly(false);
    setTypeFilter("All");
    const p = new URLSearchParams(params);
    if (next === "records") p.delete("tab");
    else p.set("tab", next);
    p.delete("record");
    setParams(p, { replace: true });
  };
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [upload, setUpload] = useState(() => params.get("upload") === "1");
  const [uploadDrafts, setUploadDrafts] = useState([]);
  const [expandedUploads, setExpandedUploads] = useState({});
  const uploadMember = useRef(activeMember.id);
  useEffect(() => {
    if (uploadMember.current !== activeMember.id) {
      uploadMember.current = activeMember.id;
      setUploadDrafts([]);
      setExpandedUploads({});
      setUpload(false);
    }
  }, [activeMember.id]);
  const [discharge, setDischarge] = useState(null);
  const [abhaSheet, setAbhaSheet] = useState(() =>
    params.get("abha") === "card" ? "card" : null,
  );
  const [abhaOnly, setAbhaOnly] = useState(false);
  const healthLinks = state.healthLinks?.[activeMember.id] || {};
  const abhaLink = healthLinks.abha;
  // Edge fades show only on the side that still has tabs to scroll to.
  const tabStrip = useRef(null);
  const [tabFade, setTabFade] = useState({ left: false, right: false });
  const updateTabFade = useCallback(() => {
    const n = tabStrip.current;
    if (!n) return;
    const next = {
      left: n.scrollLeft > 2,
      right: n.scrollLeft + n.clientWidth < n.scrollWidth - 2,
    };
    setTabFade((previous) =>
      previous.left === next.left && previous.right === next.right
        ? previous
        : next,
    );
  }, []);
  useEffect(() => {
    const strip = tabStrip.current;
    if (!strip) return;
    let frame = 0;
    let disposed = false;
    const revealSelected = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        const selectedTab = strip.querySelector(
          '[role="tab"][aria-selected="true"]',
        );
        if (!selectedTab) return;
        const bounds = strip.getBoundingClientRect();
        const item = selectedTab.getBoundingClientRect();
        if (item.left < bounds.left + 16 || item.right > bounds.right - 16) {
          strip.scrollLeft +=
            item.left - bounds.left - (bounds.width - item.width) / 2;
        }
        updateTabFade();
      });
    };
    // Counts, web fonts and narrow preview resizing can all change tab widths.
    const observer = new ResizeObserver(revealSelected);
    observer.observe(strip);
    const list = strip.querySelector('[role="tablist"]');
    if (list) observer.observe(list);
    const selectedTab = strip.querySelector(
      '[role="tab"][aria-selected="true"]',
    );
    if (selectedTab) observer.observe(selectedTab);
    document.fonts?.ready.then(() => {
      if (!disposed) revealSelected();
    });
    document.fonts?.addEventListener("loadingdone", revealSelected);
    revealSelected();
    return () => {
      disposed = true;
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", revealSelected);
      cancelAnimationFrame(frame);
    };
  }, [tab, activeMember.id, updateTabFade]);
  const { busy, error, setError, run } = useAction();
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
      : typeFilter === "abha"
        ? medical.filter((r) => r.source === "abha")
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
  function openRecord(record) {
    const p = new URLSearchParams(params);
    p.set("record", record.id);
    setParams(p);
  }
  function closeRecord() {
    const p = new URLSearchParams(params);
    p.delete("record");
    setParams(p, { replace: true });
  }
  function addUploadFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (uploadDrafts.length + files.length > 5) {
      setError(
        "Add up to 5 documents at a time. Remove a document before adding more.",
      );
      return;
    }
    const invalid = files.find(
      (file) =>
        !["application/pdf", "image/png", "image/jpeg", "image/gif"].includes(
          file.type,
        ) ||
        file.size > 10 * 1024 * 1024 ||
        file.size === 0,
    );
    if (invalid) {
      setError(
        `${invalid.name}: choose a PDF, JPG, PNG or GIF between 1 byte and 10 MB.`,
      );
      return;
    }
    setError("");
    setUploadDrafts((drafts) => [
      ...drafts,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
        type: "Pathology",
        date: dateKey(),
        notes: "",
      })),
    ]);
  }
  function updateUploadDraft(id, key, value) {
    setUploadDrafts((drafts) =>
      drafts.map((draft) =>
        draft.id === id ? { ...draft, [key]: value } : draft,
      ),
    );
  }
  function uploadRecord(e) {
    e.preventDefault();
    run(async () => {
      if (!uploadDrafts.length)
        throw new Error("Choose at least one document.");
      for (const draft of uploadDrafts) {
        if (!draft.title.trim()) {
          setExpandedUploads((current) => ({ ...current, [draft.id]: true }));
          throw new Error(`Give ${draft.file.name} a title.`);
        }
        if (!draft.date || draft.date > dateKey()) {
          setExpandedUploads((current) => ({ ...current, [draft.id]: true }));
          throw new Error(
            "Choose today or a past investigation date for every document.",
          );
        }
        if (!MEDICAL_RECORD_TYPES.includes(draft.type))
          throw new Error("Choose a supported record type for every document.");
      }
      // Publish records only after every original file is safely stored. Draft
      // IDs remain stable so retrying a storage failure cannot duplicate files.
      await Promise.all(
        uploadDrafts.map((draft) => saveFile(draft.id, draft.file)),
      );
      for (const draft of uploadDrafts) {
        dispatch({
          type: "RECORD",
          record: {
            id: draft.id,
            memberId: activeMember.id,
            title: draft.title.trim(),
            category: CATEGORY.medical,
            type: draft.type,
            date: draft.date,
            note: draft.notes.trim(),
            author: "Uploaded by you",
            format: draft.file.type === "application/pdf" ? "PDF" : "Image",
            uploaded: true,
            fileName: draft.file.name,
            mime: draft.file.type,
          },
        });
      }
      setUpload(false);
      setUploadDrafts([]);
      setTab("records");
      setTypeFilter("All");
      notify(
        uploadDrafts.length === 1
          ? "Record saved."
          : `${uploadDrafts.length} records saved.`,
      );
    });
  }
  const hasTabRecords = records.some((record) => tabFor(record) === tab);
  const emptyCopy = {
    visits: {
      title: "No prescriptions yet",
      description:
        "Prescriptions from each completed visit appear here, with the doctor’s notes.",
      action: "Book appointment",
      onAction: () => navigate("/book"),
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
    <div className={s.page}>
      <div className={banner.group}>
        <BrandHeaderPattern />
        <PageHeader
          title="Health records"
          brandBanner
          brandPattern={false}
          patientSelector
          action={
            tab === "records" &&
            hasTabRecords && (
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
        <div className={`${s.recordsTop} ${r.recordsBand} ${banner.band}`}>
          <div
            className={s.recordTabs}
            ref={tabStrip}
            onScroll={updateTabFade}
            data-fade-left={tabFade.left || undefined}
            data-fade-right={tabFade.right || undefined}
          >
            <Tabs
              value={tab}
              onValueChange={setTab}
              size="sm"
              variant="underline"
            >
              <TabsList aria-label="Record type">
                {RECORD_TABS.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    id={`records-tab-${t.id}`}
                    aria-controls="records-panel"
                    value={t.id}
                    tag={
                      t.id !== "history"
                        ? records.filter((record) => tabFor(record) === t.id)
                            .length
                        : undefined
                    }
                    leftIcon={
                      <Icon
                        name={TAB_ICONS[t.id].name}
                        family={TAB_ICONS[t.id].family}
                        corner="rounded"
                        bulk
                        size={20}
                      />
                    }
                  >
                    <span className={r.tabLabel}>{t.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>
      <div
        role="tabpanel"
        id="records-panel"
        aria-labelledby={`records-tab-${tab}`}
        className={r.recordsPanel}
      >
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
                <small>Connect with your ABHA</small>
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          ))}
        {tab !== "history" && hasTabRecords && (
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
        {tab === "records" && hasTabRecords && (
          <ChoiceGroup
            label="Record type"
            hideLabel
            options={[
              { value: "All", label: `All (${medical.length})` },
              ...MEDICAL_RECORD_TYPES.map((t) => ({
                value: t,
                label: `${t} (${typeCounts[t]})`,
              })),
              {
                value: "abha",
                label: (
                  <>
                    From ABHA <AbhaLogo />
                  </>
                ),
              },
            ]}
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value);
              setAbhaOnly(false);
            }}
          />
        )}
        {tab !== "history" && hasTabRecords && (
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
        {tab === "visits" && count > 0 && (
          <div className={r.documentGrid}>
            {prescriptions.map((record) => (
              <MedicalRecordTile
                key={record.id}
                record={record}
                onOpen={openRecord}
              />
            ))}
          </div>
        )}
        {tab === "labs" && count > 0 && (
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
        {tab === "history" && (
          <MedicalHistory
            member={activeMember}
            onUpload={() => {
              setTab("records");
              setUpload(true);
            }}
          />
        )}
        {tab !== "history" &&
          !count &&
          (!search && !hasTabRecords ? (
            <RecordEmpty
              icon={
                TAB_ICONS[tab].name === "microscope"
                  ? "document-text"
                  : TAB_ICONS[tab].name
              }
              title={emptyCopy.title}
              label={RECORD_TABS.find((t) => t.id === tab).label.toLowerCase()}
              onUpload={() => {
                setTab("records");
                setUpload(true);
              }}
            />
          ) : (
            <Empty
              className={r.recordEmpty}
              icon={
                TAB_ICONS[tab].name === "microscope"
                  ? "document-text"
                  : TAB_ICONS[tab].name
              }
              title={search ? "Nothing matches your search" : emptyCopy.title}
              description={
                search
                  ? "Try a different search or tab."
                  : emptyCopy.description
              }
              action={search ? "Clear search" : "Clear filters"}
              onAction={
                search
                  ? () => setSearch("")
                  : () => {
                      setTypeFilter("All");
                      setAbhaOnly(false);
                    }
              }
            />
          ))}
        {tab === "labs" && hasTabRecords && (
          <Notice icon="document-upload">
            <strong>Have lab results to add?</strong>
            <p>
              Upload your lab reports in Medical Records to keep them together.
            </p>
            <Button
              variant="link"
              onClick={() => {
                setTab("records");
                setUpload(true);
              }}
            >
              Upload in Medical Records
            </Button>
          </Notice>
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
      <ReportSheet record={selected} onClose={closeRecord} />
      <Sheet
        open={upload}
        documentView
        headerIcon="document-upload"
        onClose={() => {
          if (!busy) setUpload(false);
        }}
        title="Upload medical records"
        description={`For ${activeMember.name} · Up to 5 documents at once`}
        footer={
          <div className={r.uploadFooter}>
            <ErrorText>{error}</ErrorText>
            <Button
              type="submit"
              form="medical-record-upload"
              loading={busy}
              disabled={!uploadDrafts.length}
              fullWidth
            >
              {uploadDrafts.length > 1
                ? `Save ${uploadDrafts.length} records`
                : "Save record"}
            </Button>
          </div>
        }
      >
        <form
          id="medical-record-upload"
          className={r.uploadForm}
          onSubmit={uploadRecord}
          noValidate
        >
          <div className={r.uploadChooseRow}>
            <label className={`${s.uploadZone} ${r.uploadPicker}`}>
              <Icon name="document-upload" size={20} />
              <strong>
                {uploadDrafts.length === 5
                  ? "5 files selected"
                  : uploadDrafts.length
                    ? "Add files"
                    : "Choose files"}
              </strong>
              <input
                aria-label="Record file"
                type="file"
                multiple
                disabled={busy || uploadDrafts.length >= 5}
                accept="application/pdf,image/jpeg,image/png,image/gif"
                onChange={addUploadFiles}
              />
            </label>
            <span className={r.uploadCount} role="status">
              {uploadDrafts.length} of 5 selected
            </span>
          </div>
          <p className={r.uploadHint}>
            Select multiple files together, or add them one at a time.
            <br />
            PDF, JPG, PNG or GIF · Up to 10 MB each
          </p>
          {uploadDrafts.map((draft, index) => {
            const expanded = expandedUploads[draft.id] ?? index === 0;
            return (
              <section
                className={r.uploadDraft}
                key={draft.id}
                role="group"
                aria-label={`Document ${index + 1}`}
              >
                <div className={r.uploadFileHeading}>
                  <button
                    type="button"
                    className={r.uploadFileToggle}
                    aria-expanded={expanded}
                    aria-controls={`upload-fields-${draft.id}`}
                    disabled={busy}
                    onClick={() =>
                      setExpandedUploads((current) => ({
                        ...current,
                        [draft.id]: !expanded,
                      }))
                    }
                  >
                    <span className={r.uploadFileIcon}>
                      <Icon
                        name={
                          draft.file.type === "application/pdf"
                            ? "document-text"
                            : "gallery"
                        }
                        size={20}
                      />
                    </span>
                    <span className={r.uploadFileInfo}>
                      <strong>{draft.file.name}</strong>
                      <small>
                        {draft.type} · {formatDate(draft.date)} ·{" "}
                        {Math.max(1, Math.ceil(draft.file.size / 1024))} KB
                      </small>
                    </span>
                    <Icon
                      name={expanded ? "arrow-up" : "arrow-down"}
                      size={16}
                    />
                  </button>
                  <button
                    type="button"
                    className={r.uploadRemove}
                    aria-label={`Remove ${draft.file.name}`}
                    disabled={busy}
                    onClick={() => {
                      setUploadDrafts((drafts) =>
                        drafts.filter((item) => item.id !== draft.id),
                      );
                      setError("");
                    }}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
                <div
                  className={r.uploadFields}
                  id={`upload-fields-${draft.id}`}
                  hidden={!expanded}
                >
                  <Field
                    label="Record title"
                    required
                    disabled={busy}
                    maxLength={120}
                    value={draft.title}
                    onChange={(e) =>
                      updateUploadDraft(draft.id, "title", e.target.value)
                    }
                  />
                  <div className={r.uploadMetaFields}>
                    <Field
                      label="Date of Investigation"
                      type="date"
                      required
                      disabled={busy}
                      max={dateKey()}
                      value={draft.date}
                      onChange={(e) =>
                        updateUploadDraft(draft.id, "date", e.target.value)
                      }
                    />
                    <label className={r.uploadType}>
                      <span>
                        Record type <span aria-hidden="true">*</span>
                      </span>
                      <select
                        aria-label="Record type"
                        required
                        disabled={busy}
                        value={draft.type}
                        onChange={(e) =>
                          updateUploadDraft(draft.id, "type", e.target.value)
                        }
                      >
                        {MEDICAL_RECORD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className={r.uploadNotes}>
                    <span>
                      Notes <small>(optional)</small>
                      <small>{draft.notes.length}/300</small>
                    </span>
                    <textarea
                      rows={2}
                      maxLength={300}
                      disabled={busy}
                      value={draft.notes}
                      placeholder="Add details about this document"
                      onChange={(e) =>
                        updateUploadDraft(draft.id, "notes", e.target.value)
                      }
                    />
                  </label>
                </div>
              </section>
            );
          })}
        </form>
      </Sheet>
    </div>
  );
}

// Lab result status under the title: what needs attention, if anything.
function LabLine({ record }) {
  if (!record.intelligenceGeneratedAt || !record.params?.length) return null;
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

function RecordEmpty({ icon, title, label, onUpload }) {
  return (
    <section className={r.recordEmpty}>
      <span className={r.recordEmptyIcon}>
        <Icon name={icon} size={30} bulk />
      </span>
      <h2>{title}</h2>
      <Notice tone="pending">
        You’ll start seeing {label} here once your doctor or hospital uploads or
        updates them in the portal.
      </Notice>
      <Button onClick={onUpload}>
        <Icon name="document-upload" size={18} />
        Upload Records
      </Button>
    </section>
  );
}

// What the hospital knows about the patient: conditions, allergies,
// medications, surgeries, vaccinations and family history.
function MedicalHistory({ member, onUpload }) {
  const history = member.history || {};
  const total = HISTORY_SECTIONS.reduce(
    (n, sec) => n + (history[sec.key]?.length || 0),
    0,
  );
  if (!total && !history.lifestyle)
    return (
      <RecordEmpty
        icon="health"
        title="No medical history yet"
        label="your medical history"
        onUpload={onUpload}
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
              <Notice tone="pending">
                You’ll start seeing {sec.label.toLowerCase()} here once your
                doctor or hospital updates them in the portal.
              </Notice>
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
