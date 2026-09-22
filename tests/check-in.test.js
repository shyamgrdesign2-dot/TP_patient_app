import test from "node:test";
import assert from "node:assert/strict";
import { verifyArrival } from "../src/services/checkIn.js";
import { initialState, dateKey } from "../src/services/data.js";
import { locations } from "../src/config/brand.js";
import { updateState } from "../src/state/model.js";
const hospital = locations[0];
const today = dateKey();
const appointment = { status: "Confirmed", type: "In-person", date: today };
const position = () => ({
  lat: hospital.lat,
  lng: hospital.lng,
  accuracy: 20,
  timestamp: Date.now(),
});
test("arrival requires the correct day, hospital, fresh and accurate location", () => {
  assert.equal(verifyArrival(appointment, hospital, position(), today), true);
  for (const [patch, message] of [
    [{ status: "Cancelled" }, /confirmed/],
    [{ type: "Video consultation" }, /Online/],
    [{ date: dateKey(1) }, /day of/],
  ]) {
    assert.throws(
      () =>
        verifyArrival(
          { ...appointment, ...patch },
          hospital,
          position(),
          today,
        ),
      message,
    );
  }
  for (const [patch, message] of [
    [{ lat: 13.5 }, /away/],
    [{ accuracy: 101 }, /accurate/],
    [{ timestamp: Date.now() - 130000 }, /fresh/],
    [{ lat: NaN }, /fresh/],
  ]) {
    assert.throws(
      () =>
        verifyArrival(
          appointment,
          hospital,
          { ...position(), ...patch },
          today,
        ),
      message,
    );
  }
  assert.throws(
    () => verifyArrival(appointment, {}, position(), today),
    /not configured/,
  );
  assert.throws(
    () =>
      verifyArrival(
        appointment,
        { ...hospital, checkInRadiusMeters: 10 },
        position(),
        today,
      ),
    /away/,
  );
});
test("check-in creates a token once, isolates profiles, and does not store GPS", () => {
  const state = initialState();
  const appt = state.appointments.find(
    (a) => a.memberId === "self" && a.date === today,
  );
  const action = { type: "CHECK_IN", id: appt.id, position: position() };
  const next = updateState(state, action);
  const queued = next.appointments.find((a) => a.id === appt.id);
  assert.equal(queued.queue.checkedIn, true);
  assert.match(queued.queue.token, /^A-\d{3}$/);
  assert.equal(JSON.stringify(next).includes("timestamp"), false);
  assert.equal(updateState(next, action), next);
  assert.throws(
    () => updateState({ ...state, activeMember: "father" }, action),
    /active patient/,
  );
  assert.throws(
    () =>
      updateState(state, { ...action, position: { ...position(), lat: 13.5 } }),
    /away/,
  );
  assert.equal(
    state.appointments.find((a) => a.id === appt.id).queue.checkedIn,
    false,
  );
});
