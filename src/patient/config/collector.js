// "Add symptoms" target, set with VITE_SYMPTOM_COLLECTOR_URL:
// - unset or "mock": placeholder that mirrors the hosted collector (default)
// - a URL: the hosted pm-agents-pwa collector, e.g. the UAT build below
// - "off": the local guided demo
export const UAT_COLLECTOR_URL =
  "https://pm-agents-pwa-uat.tatvacare.in/symptoms-collector";
const configured = import.meta.env.VITE_SYMPTOM_COLLECTOR_URL || "mock";
export const collectorMode =
  configured === "off" ? "off" : configured === "mock" ? "mock" : "live";
export const collectorUrl = collectorMode === "live" ? configured : null;
export const collectorOrigin = collectorUrl && new URL(collectorUrl).origin;
