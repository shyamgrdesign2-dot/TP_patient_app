import { test } from "node:test";
import assert from "node:assert/strict";
import { initialState, dateKey } from "../src/shared/data.js";
import { updateState } from "../src/patient/state/model.js";
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

test("identity linking requires profile match, consent and unexpired demo verification", () => {
  const action = {
    type: "LINK_IDENTITY_DEMO",
    memberId: "self",
    method: "uhid",
    identifier: "TP-10482",
    hospitalId: "tatva-demo",
    consent: true,
    otp: "123456",
    sentAt: Date.now(),
  };
  for (const [change, expected] of [
    [{ consent: false }, /consent/],
    [{ memberId: "father" }, /does not match/],
    [{ otp: "000000" }, /Verification/],
    [{ sentAt: Date.now() - 121000 }, /expired/],
    [{ sentAt: Date.now() + 60000 }, /expired/],
  ]) {
    assert.throws(
      () => updateState(initialState(), { ...action, ...change }),
      expected,
    );
  }
  const state = updateState(initialState(), action);
  assert.equal(state.healthLinks.self.uhid.identifier, "TP-10482");
  assert.equal(state.healthLinks.father.uhid, undefined);
  assert.equal(state.records.length, initialState().records.length);
  const unlinked = updateState(state, {
    type: "UNLINK_IDENTITY_DEMO",
    memberId: "self",
    method: "uhid",
  });
  assert.equal(unlinked.healthLinks.self.uhid, null);
  assert.deepEqual(unlinked.records, state.records);
});

test("package booking requests are added with a notice and only requested ones cancel", () => {
  const s = updateState(initialState(), {
    type: "PACKAGE_REQUEST",
    request: {
      memberId: "father",
      kind: "vaccine",
      itemId: "influenza",
      itemName: "Influenza (quadrivalent)",
      price: 1950,
      clinic: "indiranagar",
      clinicName: "Indiranagar",
      date: dateKey(2),
    },
  });
  assert.equal(s.packageRequests[0].status, "Requested");
  assert.equal(s.notifications[0].type, "package");
  assert.equal(s.notifications[0].memberId, "father");
  assert.throws(
    () =>
      updateState(s, {
        type: "PACKAGE_REQUEST",
        request: { ...s.packageRequests[0], id: "x", date: dateKey(-1) },
      }),
    /future date/,
  );
  const c = updateState(s, {
    type: "PACKAGE_REQUEST_CANCEL",
    id: s.packageRequests[0].id,
  });
  assert.equal(c.packageRequests[0].status, "Cancelled");
  assert.throws(
    () =>
      updateState(c, {
        type: "PACKAGE_REQUEST_CANCEL",
        id: s.packageRequests[0].id,
      }),
    /awaiting confirmation/,
  );
});
