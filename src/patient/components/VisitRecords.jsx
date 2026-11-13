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
import { Avatar, Icon, Notice, Sheet } from "./ui";
import r from "../pages/Records.module.css";

// Past visits: one prescription per visit. The Visits tab shows the usual
// record tiles (PDF preview, date, doctor); opening one shows the
// prescription in a sheet headed by the doctor, with a Written Rx /
// Digital Rx toggle when the hospital has both, and share, download and
// print.

export function visitContext(record, appointments) {
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

export function VisitViewer({ record, onClose }) {
  const { state } = useApp();
  const format = rxFormatOf(record || {});
  // Written first, as the hospital issued it; the digital copy is one tap away.
  const [view, setView] = useState(format === "digital" ? "digital" : "written");
  useEffect(() => {
    setView(rxFormatOf(record || {}) === "digital" ? "digital" : "written");
  }, [record?.id]);
  const v = record ? visitContext(record, state.appointments || []) : null;
  const { file, error } = useVisitFile(record, view, v?.doctor);
  const slug = record ? record.title.replace(/\W+/g, "-") : "prescription";
  // The viewer names downloads after the record; a written copy is a PNG.
  const viewRecord =
    record && view === "written" && !record.uploaded
      ? { ...record, uploaded: true, fileName: `${slug}-written.png`, note: undefined }
      : record;
  return (
    <Sheet
      open={!!record}
      onClose={onClose}
      title={
        v ? (
          <span className={r.visitTitle}>
            <Avatar src={v.doctor?.image} name={v.name} size={36} />
            <span>{v.name}</span>
          </span>
        ) : (
          "Past visit"
        )
      }
      description={v ? [v.specialty, v.clinic, v.type, v.when].filter(Boolean).join(" · ") : undefined}
      documentView
    >
      {record && (
        <div className={r.visitSheet}>
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
