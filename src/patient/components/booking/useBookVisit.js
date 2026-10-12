import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../state/AppContext";
import { validateBooking } from "../../state/model";
import { slots } from "../../../shared/data";
import { readAdminConfig } from "../../../shared/hospitalConfig";

const reduced = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const successPath = (id) =>
  `/appointments/confirmed/${encodeURIComponent(id)}`;

// Video visits follow the hospital's feature switch in the console.
export const videoEnabled = () =>
  readAdminConfig().features?.videoConsult !== false;

// The clinic a doctor is booked at: the patient's hospital when the doctor
// consults there, otherwise the doctor's first clinic.
export const clinicFor = (doctor, selected) =>
  doctor.locations.includes(selected) ? selected : doctor.locations[0];

// Slots a patient can still take with this doctor on a day.
export function openSlotsFor(state, doctor, date, memberId) {
  return slots.filter((time) => {
    try {
      validateBooking(state, {
        doctorId: doctor.id,
        memberId: memberId || state.activeMember,
        location: clinicFor(doctor, state.location),
        date,
        time,
      });
      return true;
    } catch {
      return false;
    }
  });
}

// The one way a visit gets booked: manual steps and the booking assistant
// both call `book`, which saves the visit and opens the confirmation screen.
export function useBookVisit() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  // `stepsBack`: history entries the booking flow pushed (one per manual
  // step), unwound before the confirmation replaces the booking screen.
  async function book({
    doctor,
    memberId,
    date,
    time,
    type,
    intake,
    stepsBack = 0,
  }) {
    const booking = {
      id: `TP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      doctorId: doctor.id,
      memberId,
      date,
      time,
      type,
      location: clinicFor(doctor, state.location),
      source: "Patient",
      ...(intake?.memberId === memberId && intake?.intakeAnswers
        ? {
            symptomIntake: {
              note: intake.intakeNote,
              answers: intake.intakeAnswers,
              source: "local-demo",
              updatedAt: new Date().toISOString(),
            },
          }
        : {}),
    };
    // Fail before the confirming pause, so a taken slot is reported at once.
    validateBooking(state, booking);
    setConfirming(true);
    try {
      await new Promise((r) => setTimeout(r, reduced() ? 0 : 2000));
      dispatch({ type: "BOOK", booking });
      dispatch({ type: "SELECT_MEMBER", id: memberId });
      // Replace the booking screen, so Back from the confirmation (or from
      // symptoms opened there) never lands on stale booking steps.
      if (stepsBack > 0)
        await new Promise((resolve) => {
          window.addEventListener("popstate", resolve, { once: true });
          setTimeout(resolve, 600);
          navigate(-stepsBack);
        });
      navigate(successPath(booking.id), { replace: true });
      return booking;
    } finally {
      setConfirming(false);
    }
  }
  return { book, confirming };
}
