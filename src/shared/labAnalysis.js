// Reads a lab report's structured parameters against their ideal ranges.
// Pure functions shared by the patient app, the sample PDF and the tests.
//
// A parameter: { id, name, value, unit, low, high, about, impact, action }.
// `low` or `high` may be null for one-sided ranges ("below 100").

export const STATUS = {
  normal: "normal",
  borderline: "borderline",
  out: "out",
};

// Values inside the range but within this share of its width from an edge
// read as borderline, so a result sitting on the limit is called out.
const BORDERLINE_SHARE = 0.1;

function span(p) {
  if (p.low != null && p.high != null) return p.high - p.low;
  // One-sided ranges use the bound itself as a scale.
  return Math.abs(p.high ?? p.low) || 1;
}

// { status, direction } where direction is "low" | "high" | null.
export function classify(p) {
  const value = p.value === "" || p.value == null ? NaN : Number(p.value);
  if (!Number.isFinite(value))
    return { status: STATUS.normal, direction: null };
  if (p.low != null && value < p.low)
    return { status: STATUS.out, direction: "low" };
  if (p.high != null && value > p.high)
    return { status: STATUS.out, direction: "high" };
  const margin = span(p) * BORDERLINE_SHARE;
  if (p.low != null && value - p.low <= margin)
    return { status: STATUS.borderline, direction: "low" };
  if (p.high != null && p.high - value <= margin)
    return { status: STATUS.borderline, direction: "high" };
  return { status: STATUS.normal, direction: null };
}

// Where the marker sits on a three-segment bar, as a percentage of its
// width. The ideal band covers the middle half; each outer quarter shows
// one range-width beyond the limit.
export function markerPosition(p) {
  const value = Number(p.value);
  const width = span(p);
  const low = p.low ?? Math.max(0, p.high - width);
  const high = p.high ?? p.low + width;
  let pct;
  if (value < low) pct = 25 - 25 * Math.min(1, (low - value) / width);
  else if (value > high) pct = 75 + 25 * Math.min(1, (value - high) / width);
  else pct = 25 + 50 * ((value - low) / (high - low || 1));
  return Math.round(Math.min(98, Math.max(2, pct)) * 10) / 10;
}

export function rangeLabel(p) {
  if (p.low != null && p.high != null) return `${p.low} – ${p.high}`;
  if (p.high != null) return `Below ${p.high}`;
  if (p.low != null) return `Above ${p.low}`;
  return "";
}

export function statusLabel(result) {
  if (result.status === STATUS.out) return "Out of ideal range";
  if (result.status === STATUS.borderline)
    return `Borderline ${result.direction}`;
  return "Within ideal range";
}

export function formatValue(p) {
  if (p.display) return p.display;
  const value = Number(p.value);
  if (!Number.isFinite(value)) return String(p.value ?? "");
  return value >= 1000 ? value.toLocaleString("en-IN") : String(value);
}

// Every parameter with its reading, plus the ones worth acting on.
export function analyzeReport(record) {
  const params = (record?.params || []).map((p) => ({ ...p, ...classify(p) }));
  const concerning = params.filter((p) => p.status !== STATUS.normal);
  return {
    params,
    concerning,
    counts: {
      all: params.length,
      borderline: params.filter((p) => p.status === STATUS.borderline).length,
      out: params.filter((p) => p.status === STATUS.out).length,
    },
  };
}

export const FILTERS = [
  { value: "all", label: "All parameters" },
  { value: STATUS.borderline, label: "Borderline" },
  { value: STATUS.out, label: "Out of range" },
];

export function filterParams(params, filter = "all", search = "") {
  const q = search.trim().toLowerCase();
  return params.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (!q || p.name.toLowerCase().includes(q)),
  );
}

// "1 parameter is concerning" / "3 parameters are concerning".
export function concerningSummary(count) {
  if (!count) return "All parameters are within range";
  return `${count} ${count === 1 ? "parameter is" : "parameters are"} concerning`;
}
