import { dateKey, doctors, formatDate } from "../../shared/data.js";
import { locations } from "../../shared/brand.js";

const ICONS = {
  report: { name: "document-text" },
  bill: { name: "bill" },
  package: { name: "health" },
  general: { name: "notification-2" },
  "appointment-clinic": { name: "hospital", family: "building" },
  "appointment-video": { name: "video", family: "video-audio-image" },
};

// "Just now" · "12 min ago" · "Today, 9:30 AM" · "Yesterday, 4:10 PM" · "5 Oct, 9:30 AM"
export function noticeTime(notice, now = new Date()) {
  if (!notice.createdAt) return notice.date || "";
  const at = new Date(notice.createdAt);
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const clock = at
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    .toUpperCase();
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((day(now) - day(at)) / 86400000);
  if (diff === 0) return `Today, ${clock}`;
  if (diff === 1) return `Yesterday, ${clock}`;
  return `${at.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${clock}`;
}

// Resolves a notification into icon + structured subtext parts.
// Appointment subtext: "Your appointment with <Dr> is on <date · time> at <place>."
export function describeNotice(notice, appointments = []) {
  if (notice.type !== "appointment")
    return {
      icon: ICONS[notice.type] || ICONS.general,
      parts: [{ text: notice.body }],
    };
  const visit = appointments.find((a) => a.id === notice.appointmentId);
  if (!visit)
    return {
      icon: ICONS["appointment-clinic"],
      parts: [{ text: notice.body }],
    };
  const video = visit.type === "Video consultation";
  const doctor = doctors.find((d) => d.id === visit.doctorId);
  const place = video
    ? "a video consultation"
    : locations.find((l) => l.id === visit.location)?.name;
  const offset = Math.round(
    (new Date(`${visit.date}T12:00:00`) - new Date(`${dateKey()}T12:00:00`)) /
      86400000,
  );
  const day =
    offset === 0
      ? "Today"
      : offset === 1
        ? "Tomorrow"
        : formatDate(visit.date, { weekday: "short" });
  const when = `${day} · ${visit.time}`;
  const cancelled = visit.status === "Cancelled";
  const parts = [
    { text: "Your appointment with " },
    { text: doctor?.name || "your doctor", strong: true },
    { text: cancelled ? " on " : " is on " },
    { text: when, strong: true },
    { text: video ? " as " : " at " },
    { text: place, strong: !video },
    { text: cancelled ? " was cancelled." : "." },
  ];
  if (notice.body) parts.push({ text: ` ${notice.body}` });
  return {
    icon: ICONS[video ? "appointment-video" : "appointment-clinic"],
    parts,
  };
}
