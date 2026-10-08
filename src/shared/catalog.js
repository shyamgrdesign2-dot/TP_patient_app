import { packages } from "./data.js";
import { locations } from "./brand.js";
import { readAdminConfig } from "./hospitalConfig.js";

// Health check-up packages and vaccines. Tatva Practice has no sellable
// catalogue (its "packages" are bill-item bundles, and its vaccination chart
// has no catalogue), so the hospital creates these in the admin console.
// Patients request a booking and pay at the hospital counter.
const allClinicIds = locations.map((l) => l.id);

const packageDetails = {
  essential: {
    audience: "Adults 18+",
    preparation: "10–12 hours fasting. Water is fine.",
    turnaround: "Reports in 24 hours",
    includes: [
      "Complete blood count",
      "Fasting blood sugar",
      "HbA1c",
      "Lipid profile",
      "Liver function test",
      "Kidney function test",
      "Thyroid (TSH)",
      "Urine routine",
      "Physician review",
    ],
  },
  heart: {
    audience: "Adults 35+, or with a family history of heart disease",
    preparation: "10–12 hours fasting. Wear comfortable clothing for the ECG.",
    turnaround: "Reports in 24 hours",
    includes: [
      "Lipid profile",
      "HbA1c",
      "hs-CRP",
      "ECG",
      "2D echo",
      "Cardiology consultation",
    ],
  },
  senior: {
    audience: "Adults 60+",
    preparation: "10–12 hours fasting. Bring your current medicines list.",
    turnaround: "Reports in 48 hours",
    includes: [
      "Complete blood count",
      "Fasting blood sugar",
      "HbA1c",
      "Kidney function test",
      "Liver function test",
      "Thyroid profile",
      "Vitamin B12",
      "Vitamin D",
      "Urine routine",
      "ECG",
      "Physician review",
    ],
  },
  laboratory: {
    audience: "Anyone needing routine blood work",
    preparation: "8 hours fasting for blood sugar.",
    turnaround: "Reports in 12 hours",
    includes: [
      "Complete blood count",
      "Fasting blood sugar",
      "Urine routine",
      "Pathologist report",
    ],
  },
  radiology: {
    audience: "Patients with a doctor's referral",
    preparation: "No fasting needed. Bring any previous scans.",
    turnaround: "Report in 24 hours",
    includes: ["Referral review", "Digital X-ray", "Radiologist report"],
  },
};

export const seedPackages = packages.map((p) => ({
  id: p.id,
  name: p.shortName,
  category: p.category,
  description: p.description,
  price: p.price,
  mrp: p.oldPrice || "",
  icon: p.icon,
  homeCollection: !!p.collection,
  clinics: allClinicIds,
  listed: true,
  ...packageDetails[p.id],
}));

export const seedVaccines = [
  {
    id: "influenza",
    name: "Influenza (quadrivalent)",
    protects: "Seasonal flu (2 influenza A and 2 influenza B strains)",
    brands: "Vaxigrip Tetra, Influvac Tetra",
    schedule: "1 dose every year, ideally before monsoon or winter",
    eligibility: "Everyone 6 months and older",
    price: 1950,
    notes: "Tell the nurse if you have a severe egg allergy or a fever today.",
    clinics: allClinicIds,
    listed: true,
  },
  {
    id: "hpv",
    name: "HPV (Gardasil 9)",
    protects: "Cervical, anal and throat cancers and genital warts",
    brands: "Gardasil 9",
    schedule: "2 doses 6 months apart (ages 9–14); 3 doses at 0, 2 and 6 months (15+)",
    eligibility: "Girls and boys 9–14 years; adults up to 45 years",
    price: 10850,
    notes: "Not recommended during pregnancy. Sit for 15 minutes after the dose.",
    clinics: allClinicIds,
    listed: true,
  },
  {
    id: "hepb",
    name: "Hepatitis B",
    protects: "Hepatitis B liver infection",
    brands: "Engerix-B, Genevac-B",
    schedule: "3 doses at 0, 1 and 6 months",
    eligibility: "Adults not vaccinated in childhood, healthcare workers",
    price: 450,
    notes: "A blood test for immunity can be added on request.",
    clinics: allClinicIds,
    listed: true,
  },
  {
    id: "typhoid",
    name: "Typhoid conjugate",
    protects: "Typhoid fever",
    brands: "Typbar-TCV",
    schedule: "1 dose",
    eligibility: "Everyone 6 months and older",
    price: 2100,
    notes: "Recommended before travel to areas where typhoid is common.",
    clinics: allClinicIds,
    listed: true,
  },
  {
    id: "pneumococcal",
    name: "Pneumococcal (PCV13 / PPSV23)",
    protects: "Pneumonia, meningitis and blood infections",
    brands: "Prevenar 13, Pneumovax 23",
    schedule: "PCV13 once, then PPSV23 after 1 year",
    eligibility: "Adults 50+, or with diabetes, heart, lung or kidney disease",
    price: 3800,
    notes: "Your doctor confirms which vaccine you need first.",
    clinics: allClinicIds,
    listed: true,
  },
];

// The catalogue the hospital has set, or the starter one before any edit.
export function catalog(config = readAdminConfig()) {
  return {
    packages: Array.isArray(config.healthPackages)
      ? config.healthPackages
      : seedPackages,
    vaccines: Array.isArray(config.vaccines) ? config.vaccines : seedVaccines,
  };
}

// What patients see: listed items only.
export function listedCatalog(config = readAdminConfig()) {
  const { packages: p, vaccines: v } = catalog(config);
  return {
    packages: p.filter((x) => x.listed !== false),
    vaccines: v.filter((x) => x.listed !== false),
  };
}

export const packagesEnabled = (config = readAdminConfig()) =>
  config.features?.packages !== false;
