import { useEffect, useState } from "react";
import { useApp } from "../state/AppContext";
import { getFile } from "../services/files";
import { makeSamplePdf } from "../services/recordPdf";
import { makeWrittenRxImage } from "../services/writtenRx";
import { rxFormatOf } from "../services/records";
import { doctors, formatDate } from "../../shared/data";
import { locations } from "../../shared/brand";
import DocumentViewer from "./DocumentViewer";
import SegmentedControl from "./SegmentedControl";
import { Avatar, Button, Icon, Notice, Sheet } from "./ui";
import r from "../pages/Records.module.css";

// Past visits: one prescription per visit. The list shows one visit per row
// with who saw the patient, where, when and what was found; opening a visit
// shows the prescription itself with a date stepper across visits, a
// Written Rx / Digital Rx toggle when the hospital has both, and download,
// print and share. Mirrors the Past Visits view of the Tatva Practice app.

const pad2 = (n) => String(n).padStart(2, "0");

function visitContext(record, appointments) {
  const doctor = doctors.find((d) => d.id === record.doctorId);
  const appointment = appointments.find((a) => a.id === record.appointmentId);
  // Without a linked appointment (a prescription the hospital added to the
  // record), fall back to the doctor's own clinic.
  const clinic =
    locations.find((l) => l.id === appointment?.location)?.name ||
    (doctor && locations.find((l) => doctor.locations?.includes(l.id))?.name) ||
    null;
  const type = appointment?.type === "Video" ? "Video consultation" : appointment || doctor ? "In-clinic" : null;
  return {
    doctor,
    name: doctor?.name || record.author || "Hospital",
    specialty: doctor?.specialty,
    clinic,
    type,
    when: `${formatDate(record.date, { year: "numeric" })}${record.time ? ` · ${record.time}` : ""}`,
  };
}

export function VisitList({ records, onOpen }) {
  const { state } = useApp();
  return (
    <ul className={r.visitList} aria-label="Past visits">
      {records.map((record) => (
        <VisitRow key={record.id} record={record} appointments={state.appointments || []} onOpen={onOpen} />
      ))}
    </ul>
  );
}

// One visit: who, when, what was prescribed, and where (with how). Each
// detail leads with its icon and truncates on one line; the viewer has the
// rest.
function VisitRow({ record, appointments, onOpen }) {
  const v = visitContext(record, appointments);
  const medicines = (record.rx?.medicines || []).map(([name]) => name);
  const video = v.type === "Video consultation";
  return (
    <li>
      <button type="button" className={r.visitRow} onClick={() => onOpen(record)} aria-label={`Open prescription from ${v.name}, ${v.when}`}>
        <Avatar src={v.doctor?.image} name={v.name} size={44} />
        <span className={r.visitBody}>
          <strong>{v.name}</strong>
          <span className={r.visitLine}>
            <Icon name="calendar-2" size={16} />
            <span>{v.when}</span>
          </span>
          <span className={r.visitLine} data-medicines>
            <Icon name="pill" family="medical" size={16} />
            <span title={medicines.join(", ")}>{medicines.length ? medicines.join(", ") : "No medicines prescribed"}</span>
          </span>
          <span className={r.visitLine}>
            <Icon name={video ? "video" : "hospital"} family={video ? undefined : "building"} size={16} />
            <span title={[v.clinic, v.type].filter(Boolean).join(" · ")}>
              {v.clinic ? `${v.clinic}${v.type ? ` · ${v.type}` : ""}` : v.type || (record.source === "abha" ? "Shared via ABHA" : "Hospital")}
            </span>
          </span>
        </span>
        <Icon name="chevron-right" size={18} className={r.visitChevron} />
      </button>
    </li>
  );
}

// The document for a visit in the chosen view. Written = the scanned sheet
// (an image), digital = the typed prescription (a PDF).
function useVisitFile(record, view, doctor) {
  const { activeMember, brand } = useApp();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setFile(null);
    setError("");
    if (!record) return undefined;
    const make = record.uploaded
      ? getFile(record.id)
      : view === "written"
        ? makeWrittenRxImage(record, activeMember, brand, doctor)
        : makeSamplePdf(record, activeMember, brand);
    make
      .then((blob) => {
        if (cancelled) return;
        if (blob) setFile(blob);
        else setError("Original file unavailable. Please upload it again.");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this prescription. Please try again.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.id, view, activeMember.id, brand]);
  return { file, error };
}

export function VisitViewer({ records, record, onClose, onSelect }) {
  const { state } = useApp();
  const index = Math.max(0, records.findIndex((x) => x.id === record?.id));
  const format = rxFormatOf(record || {});
  // Written first, as the hospital issued it; the digital copy is one tap away.
  const [view, setView] = useState(format === "digital" ? "digital" : "written");
  useEffect(() => {
    setView(rxFormatOf(record || {}) === "digital" ? "digital" : "written");
  }, [record?.id]);
  const v = record ? visitContext(record, state.appointments || []) : null;
  const { file, error } = useVisitFile(record, view, v?.doctor);
  const older = records[index + 1];
  const newer = records[index - 1];
  const slug = record ? record.title.replace(/\W+/g, "-") : "prescription";
  // The viewer names downloads after the record; a written copy is a PNG.
  const viewRecord =
    record && view === "written" && !record.uploaded
      ? { ...record, uploaded: true, fileName: `${slug}-written.png`, note: undefined }
      : record;
  return (
    <Sheet open={!!record} onClose={onClose} title="Past visit" documentView>
      {record && (
        <div className={r.visitSheet}>
          <div className={r.visitDateNav}>
            <Button variant="ghost" aria-label="Older visit" disabled={!older} onClick={() => older && onSelect(older.id)}>
              <Icon name="chevron-left" />
            </Button>
            <label className={r.datePicker}>
              <Icon name="calendar-2" size={16} />
              <span aria-hidden="true">
                {formatDate(record.date, { year: "numeric" })}
                {record.time ? ` | ${record.time}` : ""}
              </span>
              <Icon name="chevron-down" size={14} />
              <select aria-label="Visit date" value={record.id} onChange={(e) => onSelect(e.target.value)}>
                {records.map((rx) => (
                  <option key={rx.id} value={rx.id}>
                    {formatDate(rx.date, { year: "numeric" })}
                    {rx.time ? ` | ${rx.time}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="ghost" aria-label="Newer visit" disabled={!newer} onClick={() => newer && onSelect(newer.id)}>
              <Icon name="chevron-right" />
            </Button>
          </div>
          <div className={r.visitDoctor}>
            <Avatar src={v.doctor?.image} name={v.name} size={36} />
            <div className={r.visitDoctorText}>
              <strong>{v.name}</strong>
              <span>{[v.specialty, v.clinic, v.type].filter(Boolean).join(" · ")}</span>
            </div>
            <span className={r.visitCounter} aria-label={`Visit ${index + 1} of ${records.length}`}>
              {pad2(index + 1)}/{pad2(records.length)}
            </span>
          </div>
          {format === "both" && (
            <div className={r.visitToggle}>
              <SegmentedControl
                aria-label="Prescription copy"
                variant="block"
                radius={10}
                fullWidth
                value={view}
                onValueChange={setView}
                options={[
                  { value: "written", label: "Written Rx", icon: <Icon name="edit" size={16} bulk={view === "written"} /> },
                  { value: "digital", label: "Digital Rx", icon: <Icon name="document-text" size={16} bulk={view === "digital"} /> },
                ]}
              />
            </div>
          )}
          {format === "written" && (
            <div className={r.visitToggle}>
              <Notice tone="neutral">Written at the visit. A digital copy is not available for this prescription.</Notice>
            </div>
          )}
          <div className={r.visitDoc}>
            <DocumentViewer
              key={`${record.id}-${view}`}
              record={viewRecord}
              file={file}
              error={error}
              label="Prescription"
              toolbarLabel="Prescription controls"
              controlNames={{ share: "Share prescription", download: "Download prescription", print: "Print prescription" }}
            />
          </div>
        </div>
      )}
    </Sheet>
  );
}
