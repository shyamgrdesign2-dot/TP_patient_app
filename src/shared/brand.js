// One tenant configuration is the source for UI, assets and native packaging.
export const defaultBrand = {
  id: "tatva-demo",
  name: "Tatva Practice",
  hospitalName: "Tatva Care Hospital",
  tagline: "Your health, connected.",
  primary: "#4b4ad5",
  accent: "#a461d8",
  fontBody: "Inter, system-ui, sans-serif",
  fontHeading: "Mulish, system-ui, sans-serif",
  // Hospital logos, cropped in the admin console: a square mark (512 × 512
  // PNG) and a 4:1 horizontal logo (800 × 200 PNG). Older saves only have
  // `logo`, so square spots read `logoMark || logo`.
  logo: "",
  logoMark: "",
  emergencyPhone: "",
  ambulancePhone: "",
  // Contact desk numbers shown in the app's hospital contacts.
  bookingPhone: "",
  whatsappPhone: "",
  billingPhone: "",
  callbackEnabled: false,
  // Fonts the hospital uploaded: [{ name, src (data URL) }].
  customFonts: [],
  appId: "in.tatvacare.practice.patient.demo",
};
export const brandPresets = [
  { label: "Tatva Practice", ...defaultBrand },
  {
    ...defaultBrand,
    label: "Coastal Health",
    name: "Coastal Health",
    hospitalName: "Coastal Health Hospital",
    primary: "#006b68",
    accent: "#388b87",
    fontHeading: "Inter, system-ui, sans-serif",
  },
  {
    ...defaultBrand,
    label: "Bloom Hospital",
    name: "Bloom Hospital",
    hospitalName: "Bloom Multispeciality Hospital",
    primary: "#9b385d",
    accent: "#af6280",
    fontHeading: "Mulish, system-ui, sans-serif",
  },
];
// Clinics as synced from Tatva Practice: onboarding (name, pincode,
// address, lat/long), the doctor-website clinic card (contact, city, state,
// Maps link, day-based shifts) and billing settings (GSTIN).
export const locations = [
  {
    id: "indiranagar",
    name: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    address: "100 Feet Road, Indiranagar, Bengaluru",
    pincode: "560038",
    lat: 12.9784,
    lng: 77.6408,
    phone: "+91 80 4718 2000",
    mapsUrl: "https://maps.google.com/?q=12.9784,77.6408",
    gstin: "29AABCT1332L1ZV",
    hours: "OPD · 8:00 AM – 8:00 PM",
    shifts: [
      { days: "Mon – Sat", from: "08:00 AM", to: "01:00 PM" },
      { days: "Mon – Sat", from: "04:00 PM", to: "08:00 PM" },
      { days: "Sun", from: "09:00 AM", to: "01:00 PM" },
    ],
  },
  {
    id: "whitefield",
    name: "Whitefield",
    city: "Bengaluru",
    state: "Karnataka",
    address: "Whitefield Main Road, Bengaluru",
    pincode: "560066",
    lat: 12.9698,
    lng: 77.75,
    phone: "+91 80 4718 3000",
    mapsUrl: "https://maps.google.com/?q=12.9698,77.75",
    gstin: "29AABCT1332L2ZU",
    hours: "OPD · 8:00 AM – 8:00 PM",
    shifts: [
      { days: "Mon – Fri", from: "08:00 AM", to: "02:00 PM" },
      { days: "Mon – Fri", from: "05:00 PM", to: "08:00 PM" },
      { days: "Sat", from: "09:00 AM", to: "02:00 PM" },
    ],
  },
  {
    id: "jayanagar",
    name: "Jayanagar",
    city: "Bengaluru",
    state: "Karnataka",
    address: "4th Block, Jayanagar, Bengaluru",
    pincode: "560011",
    lat: 12.925,
    lng: 77.5938,
    phone: "+91 80 4718 4000",
    mapsUrl: "https://maps.google.com/?q=12.925,77.5938",
    gstin: "29AABCT1332L3ZT",
    hours: "OPD · 9:00 AM – 7:00 PM",
    shifts: [
      { days: "Mon – Sat", from: "09:00 AM", to: "01:00 PM" },
      { days: "Mon – Sat", from: "04:00 PM", to: "07:00 PM" },
    ],
  },
];


// Open-source Google Fonts offered for headings and body text. Inter and
// Mulish are bundled with the app; the rest load from Google Fonts.
export const googleFonts = [
  ["Inter", "400;500;600;700"],
  ["Mulish", "400;500;600;700;800"],
  ["Poppins", "400;500;600;700"],
  ["Nunito Sans", "400;600;700;800"],
  ["Lato", "400;700"],
  ["Open Sans", "400;500;600;700"],
  ["Roboto", "400;500;700"],
  ["Manrope", "400;500;600;700;800"],
  ["DM Sans", "400;500;600;700"],
  ["Plus Jakarta Sans", "400;500;600;700;800"],
  ["Work Sans", "400;500;600;700"],
  ["Source Sans 3", "400;500;600;700"],
  ["Noto Sans", "400;500;600;700"],
];
const BUNDLED_FONTS = ["Inter", "Mulish"];
// "Plus Jakarta Sans, system-ui, sans-serif" -> "Plus Jakarta Sans"
export const fontFamily = (stack = "") =>
  String(stack).split(",")[0].replace(/["']/g, "").trim();
export const fontStack = (family) =>
  `${/\s/.test(family) ? `"${family}"` : family}, system-ui, sans-serif`;
export const customFontName = (fileName = "") =>
  fileName
    .replace(/\.(woff2?|ttf|otf)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9 ]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40) || "Custom font";

// Load the brand's heading and body fonts into a document: a Google Fonts
// stylesheet per family, and @font-face rules for uploaded fonts.
export function loadBrandFonts(brand, doc = globalThis.document) {
  if (!doc?.head || !brand) return;
  const custom = (brand.customFonts || []).filter(
    (f) => f?.name && /^data:(font|application)\//.test(f.src || ""),
  );
  const families = new Set(
    [brand.fontHeading, brand.fontBody].map((f) => fontFamily(f)),
  );
  for (const [name, weights] of googleFonts) {
    if (!families.has(name) || BUNDLED_FONTS.includes(name)) continue;
    if (custom.some((f) => f.name === name)) continue;
    const id = `brand-font-${name.replace(/\s+/g, "-").toLowerCase()}`;
    if (doc.getElementById(id)) continue;
    const link = doc.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, "+")}:wght@${weights}&display=swap`;
    doc.head.appendChild(link);
  }
  let style = doc.getElementById("brand-custom-fonts");
  if (!custom.length) return style?.remove();
  if (!style) {
    style = doc.createElement("style");
    style.id = "brand-custom-fonts";
    doc.head.appendChild(style);
  }
  style.textContent = custom
    .map(
      (f) =>
        `@font-face{font-family:"${f.name.replace(/"/g, "")}";src:url("${f.src}");font-display:swap;}`,
    )
    .join("\n");
}
// The square mark for icons, splash and avatar spots.
export const brandMarkSrc = (brand) => brand?.logoMark || brand?.logo || "";

// "Tatva Care Hospital" -> "TC": the fallback mark when no logo is uploaded.
export function brandMonogram(name = "") {
  const words = String(name)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(hospitals?|clinics?|the|and|of)$/i.test(w));
  const letters = (words.length ? words : String(name).split(/\s+/))
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("");
  return letters.toUpperCase() || "H";
}

export const LOGO_MAX_MB = 5;
export const LOGO_TYPE_ERROR = "Upload a PNG with a transparent background.";
// Admins upload logos as PNG only, so transparency survives cropping.
export function logoFileError(file) {
  if (!file) return "";
  if (file.type !== "image/png") return LOGO_TYPE_ERROR;
  if (file.size > LOGO_MAX_MB * 1024 * 1024)
    return `Choose a PNG under ${LOGO_MAX_MB} MB.`;
  return "";
}

export function validBrand(value) {
  return (
    value &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    /^#[0-9a-f]{6}$/i.test(value.primary) &&
    /^#[0-9a-f]{6}$/i.test(value.accent)
  );
}
export function whiteTextContrast(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0;
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 1.05 / (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] + 0.05);
}
export function distanceKm(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function hospitalCallHref(number) {
  const normalized = String(number || "").replace(/[ ()-]/g, "");
  return /^\+?\d{7,15}$/.test(normalized) ? `tel:${normalized}` : undefined;
}

// WhatsApp chat link for a hospital number; 10-digit numbers are Indian.
export function whatsappHref(number) {
  let digits = String(number || "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return /^\d{11,15}$/.test(digits) ? `https://wa.me/${digits}` : undefined;
}
// "08:00 AM – 01:00 PM" per day group, merged: "Mon – Sat" → two shifts.
export function shiftRows(shifts = []) {
  const rows = new Map();
  for (const sh of shifts) {
    const time = `${sh.from} – ${sh.to}`;
    rows.set(sh.days, [...(rows.get(sh.days) || []), time]);
  }
  return [...rows.entries()].map(([days, times]) => [days, times.join(" · ")]);
}
