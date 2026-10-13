// Health records: how records are grouped, read and linked.
// Pure helpers shared by the Records page, Home, care updates and tests.

// Tabs on the Health records page, in order.
export const RECORD_TABS = [
  { id: "records", label: "Medical records" },
  { id: "visits", label: "Visits" },
  { id: "labs", label: "Lab results" },
  { id: "history", label: "Medical history" },
  { id: "discharge", label: "Discharge summary" },
  { id: "certificates", label: "Certificates" },
];

// Record categories, as stored on each record.
export const CATEGORY = {
  prescription: "Prescriptions",
  lab: "Lab results",
  medical: "Medical records",
  discharge: "Discharge summaries",
  certificate: "Certificates",
};

// Filters inside Medical records, matching the hospital's record types.
export const MEDICAL_RECORD_TYPES = [
  "Pathology",
  "Radiology",
  "Prescription",
  "Other",
];

export const CERTIFICATE_TYPES = ["Medical fitness", "Medical leave", "Travel"];

// Use a document subtype rather than repeating the section the patient is in.
export function recordTag(record) {
  if (record.category === CATEGORY.discharge) {
    const careType = record.discharge?.careType || record.careType;
    const labels = {
      daycare: "Daycare",
      "day care": "Daycare",
      ipd: "IPD",
      inpatient: "IPD",
      emergency: "Emergency",
    };
    return labels[careType?.trim().toLowerCase()] || null;
  }
  if (record.category === CATEGORY.lab) {
    if (["Pathology", "Radiology"].includes(record.type)) return record.type;
    // Structured laboratory measurements identify pathology in older records.
    return record.params?.length ? "Pathology" : null;
  }
  return record.type || record.category || null;
}

// Which tab a record lives on.
export function tabFor(record) {
  switch (record?.category) {
    case CATEGORY.prescription:
      return "visits";
    case CATEGORY.lab:
      return "labs";
    case CATEGORY.discharge:
      return "discharge";
    case CATEGORY.certificate:
      return "certificates";
    default:
      return "records";
  }
}

// Older saves used document-style categories. Map them onto the tabs.
const LEGACY = {
  "Lab reports": (r) =>
    r.params?.length
      ? { category: CATEGORY.lab }
      : { category: CATEGORY.medical, type: r.type || "Pathology" },
  "Scans & imaging": () => ({
    category: CATEGORY.medical,
    type: "Radiology",
  }),
  "Other documents": () => ({ category: CATEGORY.medical, type: "Other" }),
};
export function normalizeRecord(record) {
  const map = LEGACY[record?.category];
  const normalized = map ? { ...record, ...map(record) } : record;
  if (
    normalized?.category === CATEGORY.medical &&
    !MEDICAL_RECORD_TYPES.includes(normalized.type)
  ) {
    // Keep the source label and clinical content while grouping older saves
    // under the same four types used by the upload form and record filters.
    return {
      ...normalized,
      ...(normalized.type && !normalized.originalType
        ? { originalType: normalized.type }
        : {}),
      type: "Other",
    };
  }
  return normalized;
}

// Keep every report in the shared sheet above its Health records list.
export function recordPath(record) {
  return `/records?tab=${tabFor(record)}&record=${encodeURIComponent(record.id)}`;
}

function byDateDesc(a, b) {
  return `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`);
}

// Past visits for a patient: each completed appointment with the
// prescription issued at it, plus prescriptions that came without an
// appointment (shared by another provider, for example via ABHA).
export function visitsFor({ appointments = [], records = [] }, memberId) {
  const rxs = records.filter(
    (r) => r.memberId === memberId && r.category === CATEGORY.prescription,
  );
  const used = new Set();
  const visits = appointments
    .filter((a) => a.memberId === memberId && a.status === "Completed")
    .map((a) => {
      const rx = rxs.find(
        (r) =>
          r.appointmentId === a.id ||
          (!r.appointmentId && r.doctorId === a.doctorId && r.date === a.date),
      );
      if (rx) used.add(rx.id);
      return {
        id: a.id,
        date: a.date,
        time: a.time,
        doctorId: a.doctorId,
        type: a.type,
        location: a.location,
        appointment: a,
        rx,
      };
    });
  for (const rx of rxs)
    if (!used.has(rx.id))
      visits.push({
        id: `rx-${rx.id}`,
        date: rx.date,
        time: rx.time,
        doctorId: rx.doctorId,
        source: rx.source,
        author: rx.author,
        rx,
      });
  return visits.sort(byDateDesc);
}

export function sortRecords(records) {
  return [...records].sort(byDateDesc);
}

// The AI summary shown for a medical record: the hospital's prepared
// summary, or a short note built from what we know about the file.
export function summarizeRecord(record) {
  if (record.summary) return { ...record.summary, prepared: true };
  const kind = record.type ? record.type.toLowerCase() : "medical";
  return {
    prepared: false,
    headline: `A ${kind} record${record.uploaded ? " you uploaded" : ""}`,
    points: [
      `Title: ${record.title}.`,
      record.author && record.author !== "Uploaded by you"
        ? `Shared by ${record.author}.`
        : "Added from your device, so the hospital has not reviewed it.",
      "We could not read findings from this file. Open it to review the details yourself.",
    ].filter(Boolean),
    next: "Share it with your doctor at your next visit if it is relevant to your care.",
  };
}

// Sections of a patient's medical history, in display order.
export const HISTORY_SECTIONS = [
  { key: "lifestyle", label: "Lifestyle", icon: "health-care" },
  { key: "conditions", label: "Medical Condition", icon: "clipboard-activity" },
  { key: "family", label: "Family History", icon: "profile-2user" },
  { key: "allergies", label: "Allergies", icon: "mask" },
  { key: "surgeries", label: "Surgical History", icon: "surgical-scissors-02" },
  { key: "additional", label: "Additional History", icon: "note-2" },
];

// One line per history entry: "Name · detail".
export function historyLine(section, item) {
  if (typeof item === "string") return [item];
  switch (section) {
    case "conditions":
      return [item.name, item.since && `Since ${item.since}`, item.status];
    case "allergies":
      return [item.name, item.reaction, item.severity];
    case "medications":
      return [item.name, item.dose, item.since && `Since ${item.since}`];
    case "surgeries":
      return [item.name, item.year, item.place];
    case "vaccinations":
      return [item.name, item.date];
    case "family":
      return [item.relation, item.condition];
    case "injuries":
    case "implants":
    case "rehabilitation":
      return [item.name, item.site, item.date, item.status, item.details];
    default:
      return [item.name];
  }
}
