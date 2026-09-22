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
  logo: "",
  emergencyPhone: "",
  ambulancePhone: "",
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
export const locations = [
  {
    id: "indiranagar",
    name: "Indiranagar",
    city: "Bengaluru",
    address: "100 Feet Road, Indiranagar, Bengaluru",
    lat: 12.9784,
    lng: 77.6408,
    hours: "OPD · 8:00 AM – 8:00 PM",
  },
  {
    id: "whitefield",
    name: "Whitefield",
    city: "Bengaluru",
    address: "Whitefield Main Road, Bengaluru",
    lat: 12.9698,
    lng: 77.75,
    hours: "OPD · 8:00 AM – 8:00 PM",
  },
  {
    id: "jayanagar",
    name: "Jayanagar",
    city: "Bengaluru",
    address: "4th Block, Jayanagar, Bengaluru",
    lat: 12.925,
    lng: 77.5938,
    hours: "OPD · 9:00 AM – 7:00 PM",
  },
];
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
