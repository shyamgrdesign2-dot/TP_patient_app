// Admin portal configuration, kept locally for this preview. In Tatva
// Practice this is served to the patient app by the hospital's config API.
const KEY = "tatva-admin-config";

export const defaultAdminConfig = {
  features: {
    videoConsult: true,
    symptomCollector: true,
    abha: true,
    bills: true,
    familyProfiles: true,
    recordUploads: true,
    packages: true,
  },
  support: { phone: "", email: "" },
  booking: { windowDays: 90, cancelCutoffHours: 2 },
  // Consultation fees and listing per doctor. Tatva Practice has no fee
  // setting, so fees live only here; profiles, clinic links and availability
  // come from each doctor's own Tatva Practice account. A doctor without a
  // fee is still bookable and pays at the clinic.
  doctors: {
    meera: { fee: 700, videoFee: 600 },
    arjun: { fee: 1000, videoFee: 900 },
    rohan: { fee: 800, videoFee: 700 },
  },
  // Clinics come from Tatva Practice. Only app-facing extras (photos and a
  // short note for patients) are kept here, per clinic id.
  clinicExtras: {},
  campaigns: [],
  // Health check-up packages and vaccines are created here by the hospital
  // (Tatva Practice has no sellable catalogue). Unset until the first edit,
  // so the patient app shows the starter catalogue: healthPackages, vaccines.
};

// Saved per-doctor settings layered over the console defaults, per doctor.
function mergeDoctors(saved = {}) {
  const ids = new Set([
    ...Object.keys(defaultAdminConfig.doctors),
    ...Object.keys(saved || {}),
  ]);
  return Object.fromEntries(
    [...ids].map((id) => [
      id,
      { ...defaultAdminConfig.doctors[id], ...(saved || {})[id] },
    ]),
  );
}

export function readAdminConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    return saved
      ? {
          ...defaultAdminConfig,
          ...saved,
          features: { ...defaultAdminConfig.features, ...saved.features },
          booking: { ...defaultAdminConfig.booking, ...saved.booking },
          support: { ...defaultAdminConfig.support, ...saved.support },
          doctors: mergeDoctors(saved.doctors),
          clinicExtras: { ...saved.clinicExtras },
        }
      : defaultAdminConfig;
  } catch {
    return defaultAdminConfig;
  }
}

export function writeAdminConfig(config) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}

// Fees and visibility set in the console, applied to the patient app on load.
export function withAdminOverrides(doctors) {
  if (typeof localStorage === "undefined") return doctors;
  const overrides = readAdminConfig().doctors || {};
  return doctors
    .map((d) => {
      // Only fees and visibility are set here; the rest comes from TP.
      const { fee, videoFee } = overrides[d.id] || {};
      return {
        ...d,
        ...(Number.isFinite(fee) && { fee }),
        ...(Number.isFinite(videoFee) && { videoFee }),
      };
    })
    .filter((d) => overrides[d.id]?.active !== false);
}
