// ABHA (Ayushman Bharat Health Account) helpers for the patient app.
//
// How ABDM sync works: ABDM keeps no central record store. Records stay with
// each Health Information Provider (hospital, lab). With the patient's consent
// (granted through the ABHA consent manager) the app, acting as a Health
// Information User, receives encrypted FHIR bundles from those providers.
// "Auto-sync" maps to a subscription consent that notifies the app when a
// linked provider publishes new records. Records this hospital creates are
// linked back to the patient's ABHA as care contexts.
import { dateKey } from "../../shared/data.js";

export const abhaAddress = (member) =>
  `${member.name
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "")}@abdm`;

// "12-3456-7890-1234" -> "XX-XXXX-XXXX-1234"
export const maskAbha = (number = "") => number.replace(/\d(?=[\d-]{4})/g, "X");

// Facilities that have published records against this ABHA (sample).
export const ABHA_FACILITIES = [
  { id: "city-diagnostics", name: "City Diagnostics", kind: "Laboratory" },
  { id: "sunrise-clinic", name: "Sunrise Family Clinic", kind: "Clinic" },
  { id: "metro-imaging", name: "Metro Imaging Centre", kind: "Radiology" },
];

export const ABHA_RECORD_TYPES = [
  "Prescriptions",
  "Lab reports",
  "Scans & imaging",
  "Discharge summaries",
];

// Records the selected facilities would return for the consent window.
export function abhaRecords(memberId, { types, facilities }) {
  const all = [
    {
      key: "lipid",
      title: "Lipid profile",
      category: "Lab reports",
      facility: "city-diagnostics",
      date: dateKey(-40),
      time: "08:20 AM",
    },
    {
      key: "hba1c",
      title: "HbA1c test",
      category: "Lab reports",
      facility: "city-diagnostics",
      date: dateKey(-95),
      time: "09:10 AM",
    },
    {
      key: "rx-fever",
      title: "Fever consultation prescription",
      category: "Prescriptions",
      facility: "sunrise-clinic",
      date: dateKey(-60),
      time: "06:40 PM",
    },
    {
      key: "usg",
      title: "Abdomen ultrasound",
      category: "Scans & imaging",
      facility: "metro-imaging",
      date: dateKey(-130),
      time: "11:30 AM",
    },
  ];
  return all
    .filter(
      (r) => types.includes(r.category) && facilities.includes(r.facility),
    )
    .map((r) => ({
      id: `abha-${memberId}-${r.key}`,
      memberId,
      title: r.title,
      category: r.category,
      date: r.date,
      time: r.time,
      author: ABHA_FACILITIES.find((f) => f.id === r.facility).name,
      source: "abha",
      format: "PDF",
      new: true,
    }));
}
