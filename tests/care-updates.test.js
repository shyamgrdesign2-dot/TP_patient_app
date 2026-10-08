import test from "node:test";
import assert from "node:assert/strict";
import { selectCareUpdates } from "../src/patient/services/careUpdates.js";
const today = "2026-09-22";
const empty = { appointments: [], records: [], bills: [], requests: [] };
const visit = (id, date = today, extra = {}) => ({
  id,
  date,
  time: "10:30 AM",
  type: "In-person",
  memberId: "self",
  status: "Confirmed",
  doctorId: "meera",
  location: "indiranagar",
  ...extra,
});
const record = (id, date = today, extra = {}) => ({
  id,
  date,
  memberId: "self",
  title: "Lab result",
  category: "Lab reports",
  ...extra,
});
const ids = ["appointments", "records", "abha"];

test("three care categories have useful first-time, stale and cancelled states", () => {
  const first = selectCareUpdates(empty, "self", today);
  assert.deepEqual(
    first.map((c) => c.id),
    ids,
  );
  assert.deepEqual(
    first.map((c) => c.state),
    ["welcome", "empty", "unlinked"],
  );
  const cards = selectCareUpdates(
    {
      ...empty,
      appointments: [
        visit("cancel", today, { status: "Cancelled" }),
        visit("far", "2026-11-01"),
        visit("old", "2026-08-01", { status: "Completed" }),
      ],
      records: [
        record("old", "2026-09-01", { new: true }),
        record("private", today, { released: false }),
        record("upload", today, { uploaded: true }),
      ],
    },
    "self",
    today,
  );
  assert.equal(cards[0].state, "available");
  assert.equal(cards[1].state, "history");
  assert.equal(cards[1].action.path, "/records");
  assert.ok(!cards.some((c) => c.entityId));
});
test("today's visit and unseen report states select authorized patient events without duplicate visit cards", () => {
  const data = {
    ...empty,
    appointments: [
      visit("late", today, { time: "12:30 PM" }),
      visit("other", today, { memberId: "father", time: "08:00 AM" }),
      visit("today", today),
      visit("done", "2026-09-20", { status: "Completed" }),
    ],
    records: [
      record("seen"),
      record("new", "2026-09-21", { new: true }),
      record("other", today, { memberId: "father", new: true }),
    ],
  };
  const before = JSON.stringify(data);
  const cards = selectCareUpdates(data, "self", today);
  assert.deepEqual(
    cards.map((c) => c.id),
    ids,
  );
  assert.equal(cards[0].entityId, "today");
  assert.equal(cards[0].state, "upcoming");
  assert.equal(cards[0].status, "Confirmed");
  assert.equal(cards[0].action.label, "Add symptoms");
  assert.equal(cards[0].action.path, "/assistant?appointment=today");
  assert.equal(cards[0].detail, "Today · 10:30 AM");
  assert.ok(!("wait" in cards[0]));
  assert.equal(cards[1].entityId, "new");
  assert.equal(JSON.stringify(data), before);
});
test("freshness boundaries transition to history and completed visits reuse the appointment category", () => {
  const data = {
    ...empty,
    appointments: [visit("done", "2026-08-23", { status: "Completed" })],
    records: [record("recent", "2026-09-15")],
  };
  let cards = selectCareUpdates(data, "self", today);
  assert.equal(cards[0].state, "completed");
  assert.equal(cards[0].action.path, "/appointments?visit=done");
  assert.equal(cards[1].state, "available");
  cards = selectCareUpdates(data, "self", "2026-09-23");
  assert.equal(cards[0].state, "available");
  assert.equal(cards[1].state, "history");
  const published = selectCareUpdates(
    {
      ...empty,
      records: [
        record("published", "2025-01-01", {
          new: true,
          publishedAt: "2026-09-22T10:00:00Z",
        }),
      ],
    },
    "self",
    today,
  );
  assert.equal(published[1].entityId, "published");
});
test("directory injection and missing references produce safe visit actions", () => {
  const data = {
    ...empty,
    appointments: [
      visit("server", today, {
        doctorId: "server-doctor",
        location: "server-location",
      }),
    ],
  };
  const [card] = selectCareUpdates(data, "self", today, {
    doctors: [
      { id: "server-doctor", name: "Dr. Example", specialty: "Cardiology" },
    ],
    locations: [{ id: "server-location", name: "Central hospital" }],
  });
  assert.equal(card.title, "Dr. Example");
  assert.equal(card.meta, "Central hospital");
  const [fallback] = selectCareUpdates(data, "self", today, {
    doctors: [],
    locations: [],
  });
  assert.equal(fallback.title, "Your doctor");
  assert.equal(fallback.meta, "Your hospital");
});
test("prepared visits, completed symptoms and linked ABHA have distinct actions", () => {
  const data = {
    ...empty,
    appointments: [visit("q", today, { symptomIntake: { note: "Headache" } })],
    healthLinks: { self: { abha: { identifier: "linked" } } },
  };
  const cards = selectCareUpdates(data, "self", today);
  assert.equal(cards[0].tone, "primary");
  assert.equal(cards[0].action.label, "View visit");
  assert.equal(cards[0].action.path, "/appointments?visit=q");
  assert.ok(!cards.some((c) => c.action.path.includes("queue")));
  assert.equal(cards[2].state, "linked");
  assert.equal(cards[2].action.path, "/records?abha=card");
  const other = selectCareUpdates(data, "father", today);
  assert.equal(other[2].state, "unlinked");
});
test("all 8 event combinations retain three unique patient-scoped categories", () => {
  for (let mask = 0; mask < 8; mask++) {
    const data = {
      ...empty,
      appointments: mask & 1 ? [visit("next")] : [],
      records: mask & 2 ? [record("r", today, { new: true })] : [],
      healthLinks: mask & 4 ? { self: { abha: { identifier: "linked" } } } : {},
    };
    const cards = selectCareUpdates(data, "self", today);
    assert.deepEqual(
      cards.map((c) => c.id),
      ids,
    );
    assert.ok(cards.every((c) => c.memberId === "self"));
    assert.deepEqual(
      selectCareUpdates(data, "father", today).map((c) => c.state),
      ["welcome", "empty", "unlinked"],
    );
  }
});
