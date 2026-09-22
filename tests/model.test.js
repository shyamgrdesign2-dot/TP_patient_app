import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, dateKey } from "../src/services/data.js";
import { updateState } from "../src/state/model.js";
const booking = (overrides = {}) => ({
  id: "test-booking",
  memberId: "father",
  doctorId: "arjun",
  location: "indiranagar",
  date: dateKey(3),
  time: "09:00 AM",
  type: "In-person",
  source: "Patient",
  ...overrides,
});
test("booking persists selected family identity and generates its own notification", () => {
  const s = updateState(initialState(), { type: "BOOK", booking: booking() });
  assert.equal(s.appointments[0].memberId, "father");
  assert.equal(s.appointments[0].status, "Confirmed");
  assert.equal(s.notifications[0].memberId, "father");
});
test("duplicate doctor slots cannot be booked twice", () => {
  const s = updateState(initialState(), { type: "BOOK", booking: booking() });
  assert.throws(
    () =>
      updateState(s, {
        type: "BOOK",
        booking: booking({ id: "another", memberId: "self" }),
      }),
    /just booked/,
  );
});
test("cancelled slots become available and a second cancellation is rejected", () => {
  const s = updateState(initialState(), { type: "BOOK", booking: booking() });
  const c = updateState(s, { type: "CANCEL", id: "test-booking" });
  assert.throws(
    () => updateState(c, { type: "CANCEL", id: "test-booking" }),
    /confirmed/,
  );
  const next = updateState(c, {
    type: "BOOK",
    booking: booking({ id: "replacement" }),
  });
  assert.equal(next.appointments[0].id, "replacement");
});
test("rescheduling rejects slot conflicts without altering previous state", () => {
  const s = updateState(initialState(), { type: "BOOK", booking: booking() });
  assert.throws(
    () =>
      updateState(s, {
        type: "RESCHEDULE",
        id: "test-booking",
        date: dateKey(2),
        time: "11:00 AM",
      }),
    /just booked/,
  );
  assert.equal(s.appointments[0].date, dateKey(3));
});
test("unrecognised profiles and past appointments are rejected", () => {
  assert.throws(
    () =>
      updateState(initialState(), {
        type: "BOOK",
        booking: booking({ memberId: "someone-else" }),
      }),
    /authorised/,
  );
  assert.throws(
    () =>
      updateState(initialState(), {
        type: "BOOK",
        booking: booking({ date: dateKey(-1) }),
      }),
    /future/,
  );
});
test("record cannot attach to an unknown profile", () => {
  assert.throws(
    () =>
      updateState(initialState(), {
        type: "RECORD",
        record: { memberId: "stranger" },
      }),
    /authorised/,
  );
});
test("demo payment can settle an invoice only once", () => {
  const state = updateState(initialState(), {
    type: "PAY_DEMO",
    id: "INV-1048",
    method: "UPI",
  });
  assert.equal(state.bills[0].status, "Paid");
  assert.match(state.bills[0].transaction, /^DEMO-/);
  assert.throws(
    () =>
      updateState(state, { type: "PAY_DEMO", id: "INV-1048", method: "UPI" }),
    /already paid/,
  );
});
test("profile updates preserve MRN, and future birth dates are rejected", () => {
  const s = initialState();
  const member = { ...s.members[0], name: "Edited name" };
  const next = updateState(s, { type: "SAVE_MEMBER", member });
  assert.equal(next.members[0].mrn, s.members[0].mrn);
  assert.throws(
    () =>
      updateState(s, {
        type: "SAVE_MEMBER",
        member: { ...member, dob: dateKey(1) },
      }),
    /valid date/,
  );
});
test("invalid doctor/location and impossible dates cannot create appointments", () => {
  assert.throws(
    () =>
      updateState(initialState(), {
        type: "BOOK",
        booking: booking({ doctorId: "unknown" }),
      }),
    /not available/,
  );
  assert.throws(
    () =>
      updateState(initialState(), {
        type: "BOOK",
        booking: booking({ location: "whitefield" }),
      }),
    /not available/,
  );
  assert.throws(
    () =>
      updateState(initialState(), {
        type: "BOOK",
        booking: booking({ date: "2027-02-31" }),
      }),
    /valid appointment date/,
  );
});
test("one family member cannot book different doctors for the same time", () => {
  const s = updateState(initialState(), { type: "BOOK", booking: booking() });
  assert.throws(
    () =>
      updateState(s, {
        type: "BOOK",
        booking: booking({ id: "second", doctorId: "meera" }),
      }),
    /already has an appointment/,
  );
});
