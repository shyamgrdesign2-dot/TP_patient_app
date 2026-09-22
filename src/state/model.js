import { dateKey, slots, doctors } from "../services/data.js";
import { locations } from "../config/brand.js";
export function memberExists(state, id) {
  if (!state.members.some((m) => m.id === id))
    throw new Error("Select an authorised family member.");
}
export function validateBooking(state, booking, excludeId) {
  memberExists(state, booking.memberId);
  if (!booking.doctorId || !booking.location || !booking.date || !booking.time)
    throw new Error("Choose a doctor, location, date and time.");
  const doctor = doctors.find((d) => d.id === booking.doctorId);
  if (!doctor?.locations.includes(booking.location))
    throw new Error("This doctor is not available at the selected hospital.");
  const parsedDate = new Date(`${booking.date}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(booking.date) ||
    Number.isNaN(+parsedDate) ||
    parsedDate.toISOString().slice(0, 10) !== booking.date
  )
    throw new Error("Choose a valid appointment date.");
  if (booking.date < dateKey())
    throw new Error("Please choose today or a future date.");
  if (!slots.includes(booking.time))
    throw new Error("Select an available appointment time.");
  const [hour, minute] = booking.time.slice(0, 5).split(":").map(Number);
  const hour24 = (hour % 12) + (booking.time.includes("PM") ? 12 : 0);
  const instant = new Date(
    `${booking.date}T${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`,
  );
  if (instant <= new Date())
    throw new Error(
      "That appointment time has passed. Please choose a future slot.",
    );
  if (
    state.appointments.some(
      (a) =>
        a.id !== excludeId &&
        a.status === "Confirmed" &&
        a.doctorId === booking.doctorId &&
        a.date === booking.date &&
        a.time === booking.time,
    )
  )
    throw new Error("This slot was just booked. Please choose another time.");
  if (
    state.appointments.some(
      (a) =>
        a.id !== excludeId &&
        a.memberId === booking.memberId &&
        a.status === "Confirmed" &&
        a.date === booking.date &&
        a.time === booking.time,
    )
  )
    throw new Error(
      "This family member already has an appointment at that time.",
    );
}
const notice = (title, body, route, memberId) => ({
  id: crypto.randomUUID(),
  title,
  body,
  route,
  memberId,
  date: "Just now",
  icon: "notification",
  read: false,
});
export function updateState(state, action) {
  switch (action.type) {
    case "SELECT_MEMBER":
      memberExists(state, action.id);
      return { ...state, activeMember: action.id };
    case "LOCATION":
      if (!locations.some((l) => l.id === action.id))
        throw new Error("Choose a hospital from the list.");
      return { ...state, location: action.id };
    case "BOOK": {
      validateBooking(state, action.booking);
      return {
        ...state,
        appointments: [
          { ...action.booking, status: "Confirmed" },
          ...state.appointments,
        ],
        notifications: [
          notice(
            "Appointment confirmed",
            `Your appointment on ${action.booking.date} at ${action.booking.time} is confirmed.`,
            "/appointments",
            action.booking.memberId,
          ),
          ...state.notifications,
        ],
      };
    }
    case "CANCEL": {
      const appointment = state.appointments.find((a) => a.id === action.id);
      if (!appointment || appointment.status !== "Confirmed")
        throw new Error("Only confirmed appointments can be cancelled.");
      memberExists(state, appointment.memberId);
      return {
        ...state,
        appointments: state.appointments.map((a) =>
          a.id === action.id ? { ...a, status: "Cancelled" } : a,
        ),
      };
    }
    case "RESCHEDULE": {
      const old = state.appointments.find((a) => a.id === action.id);
      if (!old || old.status !== "Confirmed")
        throw new Error("This appointment cannot be rescheduled.");
      const updated = {
        ...old,
        date: action.date,
        time: action.time,
        queue: undefined,
      };
      validateBooking(state, updated, old.id);
      return {
        ...state,
        appointments: state.appointments.map((a) =>
          a.id === old.id ? updated : a,
        ),
      };
    }
    case "CHECK_IN":
      return {
        ...state,
        appointments: state.appointments.map((a) =>
          a.id === action.id && a.queue && a.status === "Confirmed"
            ? { ...a, queue: { ...a.queue, checkedIn: true } }
            : a,
        ),
      };
    case "SAVE_MEMBER": {
      if (
        !action.member.name?.trim() ||
        !action.member.dob ||
        action.member.dob > dateKey()
      )
        throw new Error("Enter a name and valid date of birth.");
      if (!action.member.phone || !/^[6-9]\d{9}$/.test(action.member.phone))
        throw new Error("Enter a valid 10-digit mobile number.");
      if (!action.member.id) throw new Error("A profile ID is required.");
      return {
        ...state,
        members: state.members.some((m) => m.id === action.member.id)
          ? state.members.map((m) =>
              m.id === action.member.id ? { ...m, ...action.member } : m,
            )
          : [...state.members, action.member],
      };
    }
    case "RECORD":
      memberExists(state, action.record.memberId);
      return { ...state, records: [action.record, ...state.records] };
    case "PAY_DEMO": {
      const bill = state.bills.find((b) => b.id === action.id);
      if (!bill || bill.status !== "Unpaid")
        throw new Error("This bill is already paid or unavailable.");
      memberExists(state, bill.memberId);
      return {
        ...state,
        bills: state.bills.map((b) =>
          b.id === action.id
            ? {
                ...b,
                status: "Paid",
                method: action.method,
                transaction: `DEMO-${crypto.randomUUID().slice(0, 8)}`,
              }
            : b,
        ),
      };
    }
    case "READ_NOTICE":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          action.id === "all" || n.id === action.id ? { ...n, read: true } : n,
        ),
      };
    case "PREFERENCE":
      return {
        ...state,
        preferences: { ...state.preferences, [action.key]: action.value },
      };
    case "REQUEST":
      memberExists(state, action.request.memberId);
      return {
        ...state,
        requests: [
          { ...action.request, status: "Requested" },
          ...state.requests,
        ],
      };
    case "CONTACT":
      return { ...state, contacts: [...state.contacts, action.contact] };
    case "FEEDBACK":
      return { ...state, feedback: [action.feedback, ...state.feedback] };
    case "ABHA_DEMO":
      memberExists(state, action.memberId);
      return {
        ...state,
        abha: { ...state.abha, [action.memberId]: action.linked },
      };
    default:
      return state;
  }
}
