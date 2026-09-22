import { dateKey, doctors, formatDate, money } from "./data.js";
import { locations } from "../config/brand.js";

// Stable categories, conditional visibility. Priority is part of the client contract.
export const CARE_CATEGORIES = Object.freeze([
  { id: "appointments", label: "Appointments", icon: "calendar-2" },
  { id: "records", label: "Health records", icon: "document-text" },
  { id: "payments", label: "Payments", icon: "bill" },
  { id: "completed", label: "Recent visit", icon: "calendar-tick" },
]);
export const LONG_WAIT_MINUTES = 30;
export const CARE_WINDOWS = Object.freeze({
  upcoming: 30,
  records: 7,
  bills: 14,
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
  const checkedIn = appointments.find(
    (item) =>
      item.date === today &&
      item.status === "Confirmed" &&
      item.queue?.checkedIn,
  );
  const upcoming =
    checkedIn ||
    appointments
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
  const bills = state.bills.filter(
    (item) =>
      item.memberId === memberId &&
      item.status === "Unpaid" &&
      (recent(item.date, today, CARE_WINDOWS.bills) ||
        (item.dueDate && days(item.dueDate, today) <= 0)),
  );
  const content = {};
  function appointmentCard(visit, isCompleted = false) {
    const doctor = doctorDirectory.find((item) => item.id === visit.doctorId);
    return {
      state: isCompleted ? "completed" : "upcoming",
      tone: isCompleted ? "success" : "primary",
      priority: isCompleted ? 60 : visit.date === today ? 10 : 30,
      label: isCompleted ? "Latest completed visit" : "Upcoming appointment",
      status: isCompleted
        ? "Completed"
        : visit.queue?.checkedIn
          ? "Checked in"
          : "Confirmed",
      title: doctor?.name || "Your doctor",
      description: doctor?.specialty || "Hospital consultation",
      image: doctor?.image,
      entityId: visit.id,
      detail: `${visit.date === today ? "Today" : formatDate(visit.date)} · ${visit.time}`,
      meta:
        hospitalLocations.find((item) => item.id === visit.location)?.name ||
        "Your hospital",
      action: {
        label: isCompleted
          ? "View summary"
          : visit.queue?.checkedIn
            ? "View queue"
            : "View visit",
        path:
          visit.queue?.checkedIn && !isCompleted
            ? "/queue"
            : `/appointments?visit=${encodeURIComponent(visit.id)}`,
      },
    };
  }
  if (upcoming) {
    content.appointments = appointmentCard(upcoming);
    if (upcoming.queue?.checkedIn)
      content.appointments = {
        ...content.appointments,
        state: "queue",
        label: "Your hospital queue",
        status:
          upcoming.queue.minutes >
          (upcoming.queue.expectedMinutes ?? LONG_WAIT_MINUTES)
            ? "Longer wait"
            : "Checked in",
        tone:
          upcoming.queue.minutes >
          (upcoming.queue.expectedMinutes ?? LONG_WAIT_MINUTES)
            ? "warning"
            : "success",
        priority: 0,
        title: `Token ${upcoming.queue.token}`,
        description: `${content.appointments.title} · ${upcoming.queue.ahead} ahead`,
        detail: `~${upcoming.queue.minutes} min wait`,
        meta: content.appointments.meta,
        action: { label: "View queue", path: "/queue" },
      };
    else if (upcoming.date === today && upcoming.type === "In-person") {
      const prepared =
        upcoming.symptomIntake ||
        upcoming.symptomIntakeSkipped ||
        upcoming.symptomCollectorStatus === "completed";
      content.appointments.action = prepared
        ? {
            label: "Check in",
            path: `/queue?visit=${encodeURIComponent(upcoming.id)}`,
          }
        : {
            label: "Share symptoms",
            path: `/assistant?appointment=${encodeURIComponent(upcoming.id)}&return=queue`,
          };
    }
  }
  if (record)
    content.records = {
      state: record.new ? "new" : "available",
      tone: "info",
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
  if (bills.length)
    content.payments = {
      state: "due",
      tone: "warning",
      priority: bills.some(
        (item) => item.dueDate && days(item.dueDate, today) < 0,
      )
        ? 15
        : 50,
      label: "Your outstanding bills",
      status: "Payment due",
      title: `${money(bills.reduce((total, bill) => total + bill.amount, 0))} outstanding`,
      description: `${bills.length} ${bills.length === 1 ? "new or due bill" : "new or due bills"} from your hospital`,
      detail: "Bills & receipts",
      entityId: bills[0].id,
      action: { label: "View bills", path: "/billing" },
    };
  if (completed) content.completed = appointmentCard(completed, true);
  const updates = CARE_CATEGORIES.filter((category) => content[category.id])
    .map((category) => ({
      ...content[category.id],
      id: category.id,
      category,
      memberId,
    }))
    .sort((a, b) => a.priority - b.priority);
  // A first visit is a single welcome card, never a carousel filler.
  // Returning patients with no relevant events see their home actions directly.
  const hasHistory =
    appointments.length ||
    state.records.some((item) => item.memberId === memberId) ||
    state.bills.some((item) => item.memberId === memberId);
  if (!updates.length && !hasHistory)
    return [
      {
        id: "welcome",
        memberId,
        category: {
          id: "welcome",
          label: "Your care starts here",
          icon: "calendar-2",
        },
        state: "welcome",
        tone: "primary",
        priority: 100,
        label: "Book your first visit",
        status: "Welcome",
        title: "Let’s plan your first visit.",
        description: "Find a doctor and a time that works for you.",
        detail: "Here when you need us",
        action: { label: "Find a doctor", path: "/doctors" },
      },
    ];
  return updates;
}
