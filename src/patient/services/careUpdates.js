import { dateKey, doctors, formatDate, money } from "../../shared/data.js";
import { needsSymptoms } from "./symptomReminders.js";
import { abhaAddress, maskAbha } from "./abha.js";
import { locations } from "../../shared/brand.js";

// Three stable categories; each derives its state from the active patient.
export const CARE_CATEGORIES = Object.freeze([
  { id: "appointments", label: "Appointments", icon: "calendar-2" },
  { id: "records", label: "Health records", icon: "document-text" },
  { id: "abha", label: "Connected health", icon: "abha" },
]);
export const CARE_WINDOWS = Object.freeze({
  upcoming: 30,
  records: 7,
  completed: 30,
});
function days(date, today) {
  return (
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) /
    86400000
  );
}
function recent(date, today, window) {
  const age = -days(date, today);
  return age >= 0 && age <= window;
}
function minutes(time = "") {
  const [hour, minute, period] = time.split(/[: ]/);
  return (
    ((Number(hour) % 12) + (period === "PM" ? 12 : 0)) * 60 + Number(minute)
  );
}
function visitOrder(a, b) {
  return (
    a.date.localeCompare(b.date) ||
    minutes(a.time) - minutes(b.time) ||
    a.id.localeCompare(b.id)
  );
}
export function selectCareUpdates(
  state,
  memberId,
  today = dateKey(),
  directory = {},
) {
  const doctorDirectory = directory.doctors ?? doctors;
  const hospitalLocations = directory.locations ?? locations;
  const appointments = state.appointments.filter(
    (item) => item.memberId === memberId,
  );
  const upcoming = appointments
    .filter(
      (item) =>
        item.status === "Confirmed" &&
        days(item.date, today) >= 0 &&
        days(item.date, today) <= CARE_WINDOWS.upcoming,
    )
    .sort(visitOrder)[0];
  const completed = appointments
    .filter(
      (item) =>
        item.status === "Completed" &&
        recent(item.date, today, CARE_WINDOWS.completed),
    )
    .sort((a, b) => visitOrder(b, a))[0];
  const record = state.records
    .filter(
      (item) =>
        item.memberId === memberId &&
        item.released !== false &&
        !item.uploaded &&
        item.source !== "Patient" &&
        recent(
          (item.publishedAt || item.date || "").slice(0, 10),
          today,
          CARE_WINDOWS.records,
        ),
    )
    .sort(
      (a, b) =>
        Number(!!b.new) - Number(!!a.new) ||
        (b.publishedAt || b.date).localeCompare(a.publishedAt || a.date) ||
        a.id.localeCompare(b.id),
    )[0];
  const content = {};
  function appointmentCard(visit, isCompleted = false) {
    const doctor = doctorDirectory.find((item) => item.id === visit.doctorId);
    return {
      state: isCompleted ? "completed" : "upcoming",
      tone: isCompleted ? "success" : "primary",
      priority: 10,
      label: isCompleted ? "Latest completed visit" : "Upcoming appointment",
      status: isCompleted ? "Completed" : "Confirmed",
      title: doctor?.name || "Your doctor",
      description: doctor?.specialty || "Hospital consultation",
      image: doctor?.image,
      entityId: visit.id,
      visitType: visit.type,
      detail: `${visit.date === today ? "Today" : formatDate(visit.date)} · ${visit.time}`,
      meta:
        hospitalLocations.find((item) => item.id === visit.location)?.name ||
        "Your hospital",
      action: {
        label: isCompleted ? "View summary" : "View visit",
        path: `/appointments?visit=${encodeURIComponent(visit.id)}`,
      },
    };
  }
  if (upcoming) {
    content.appointments = appointmentCard(upcoming);
    if (
      upcoming.date === today &&
      upcoming.type === "In-person" &&
      !upcoming.symptomIntakeSkipped &&
      needsSymptoms(upcoming)
    )
      content.appointments.action = {
        label: "Add symptoms",
        path: `/assistant?appointment=${encodeURIComponent(upcoming.id)}`,
      };
  }
  if (record)
    content.records = {
      state: record.new ? "new" : "available",
      tone: "neutral",
      priority: record.new ? 20 : 40,
      label: record.new ? "New health record" : "Latest health record",
      status: record.new ? "New report" : "Recently added",
      title: record.new
        ? "Your report is ready."
        : "New to your health records.",
      description: record.title,
      detail: formatDate(record.date),
      meta: record.category,
      entityId: record.id,
      action: {
        label: "View report",
        path: `/records?record=${encodeURIComponent(record.id)}`,
      },
    };

  if (!upcoming) {
    content.appointments = completed
      ? appointmentCard(completed, true)
      : {
          state: appointments.length ? "available" : "welcome",
          tone: "primary",
          priority: 10,
          label: appointments.length
            ? "Plan your next visit"
            : "Book your first visit",
          status: "Book a visit",
          title: appointments.length
            ? "Ready for your next visit?"
            : "Let’s plan your first visit.",
          description: "Choose your doctor and a time that suits you.",
          detail: "In clinic or by video",
          action: { label: "Find a doctor", path: "/doctors" },
        };
  }
  if (!record) {
    const count = state.records.filter(
      (item) => item.memberId === memberId && item.released !== false,
    ).length;
    content.records = {
      state: count ? "history" : "empty",
      tone: "neutral",
      priority: 20,
      label: "Your health records",
      status: count ? "Your records" : "Getting started",
      title: count
        ? "Your health history, together."
        : "A home for your health records.",
      description: count
        ? "Find reports and prescriptions in one place."
        : "Hospital reports will appear here. You can add your own too.",
      detail: count
        ? `${count} saved ${count === 1 ? "record" : "records"}`
        : "Reports · Prescriptions · Scans",
      action: {
        label: count ? "View records" : "Add a record",
        path: count ? "/records" : "/records?upload=1",
      },
    };
  }
  const abha = state.healthLinks?.[memberId]?.abha;
  const member = (state.members || []).find((m) => m.id === memberId) || {
    name: "patient",
  };
  // Linked: compact identity card (address as the headline, number below,
  // one action). Unlinked: the invitation to link.
  content.abha = abha
    ? {
        state: "linked",
        tone: "primary",
        priority: 80,
        label: "Your ABHA",
        categoryLabel: "ABHA",
        status: "Connected",
        title: abha.address || abhaAddress(member),
        description: maskAbha(abha.identifier),
        detail: "",
        action: { label: "View ABHA card", path: "/records?abha=card" },
      }
    : {
        state: "unlinked",
        tone: "primary",
        priority: 80,
        label: "Link your ABHA",
        status: "Connect ABHA",
        title: "Your health, connected.",
        description: "Link your ABHA to your hospital profile.",
        detail: "One health identity",
        action: { label: "Link ABHA", path: "/abha" },
      };
  return CARE_CATEGORIES.map((category) => ({
    ...content[category.id],
    id: category.id,
    category,
    memberId,
  }));
}
