export const isVideo = (visit) => visit?.type === "Video consultation";

// Joining opens 15 minutes before the slot and stays open for an hour after.
const EARLY_MINUTES = 15;
const LATE_MINUTES = 60;

export function visitStart(visit) {
  const [, h, m, meridiem] = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(
    visit.time.trim(),
  ) || ["", "0", "0", "AM"];
  const hours = (Number(h) % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0);
  const start = new Date(`${visit.date}T00:00:00`);
  start.setHours(hours, Number(m), 0, 0);
  return start;
}

export function joinOpensAt(visit) {
  return new Date(visitStart(visit).getTime() - EARLY_MINUTES * 60000);
}

// "open" | "early" | "ended" | null (not a joinable video visit)
export function joinState(visit, now = new Date()) {
  if (!isVideo(visit) || visit.status !== "Confirmed") return null;
  const start = visitStart(visit).getTime();
  if (now.getTime() < start - EARLY_MINUTES * 60000) return "early";
  if (now.getTime() > start + LATE_MINUTES * 60000) return "ended";
  return "open";
}

export const clockLabel = (date) =>
  date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

// A sample slot a few minutes from now, so the join window is live in the demo.
export function soonSlot(minutes = 10) {
  const d = new Date(Date.now() + minutes * 60000);
  d.setMinutes(Math.floor(d.getMinutes() / 5) * 5);
  const h = d.getHours() % 12 || 12;
  return `${String(h).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "AM" : "PM"}`;
}
