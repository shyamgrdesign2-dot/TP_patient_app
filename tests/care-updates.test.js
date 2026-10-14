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
  assert.deepEqual(cards[0].detail, ["Today", "10:30 AM"]);
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

test("preventive care is the fourth card only when enabled, with patient-scoped booking states", () => {
  const directory = {
    config: {
      features: { packages: true },
      healthPackages: [
        { id: "lab", name: "Laboratory package", price: 1499 },
        { id: "hidden", name: "Unlisted", price: 1, listed: false },
      ],
      vaccines: [],
    },
  };
  const cards = selectCareUpdates(empty, "self", today, directory);
  assert.deepEqual(
    cards.map((c) => c.id),
    [...ids, "packages"],
  );
  assert.equal(cards[3].detail, "Health checks from ₹1,499");
  assert.equal(cards[3].action.path, "/packages");
  const data = {
    ...empty,
    packageRequests: [
      {
        memberId: "father",
        status: "Requested",
        date: today,
        itemName: "Other patient",
      },
      {
        memberId: "self",
        status: "Cancelled",
        date: today,
        itemName: "Cancelled",
      },
      {
        memberId: "self",
        status: "Requested",
        date: today,
        itemName: "Laboratory package",
      },
    ],
  };
  const booked = selectCareUpdates(data, "self", today, directory)[3];
  assert.equal(booked.title, "Laboratory package");
  assert.equal(booked.action.path, "/packages?tab=bookings");
  directory.config.features.packages = false;
  assert.deepEqual(
    selectCareUpdates(data, "self", today, directory).map((c) => c.id),
    ids,
  );
});

test("every supported banner variant has a status, middle content and actionable footer", () => {
  const config = {
    features: { packages: true },
    healthPackages: [],
    vaccines: [],
  };
  const scenarios = [
    empty,
    {
      ...empty,
      appointments: [visit("cancelled", today, { status: "Cancelled" })],
    },
    { ...empty, appointments: [visit("next", "2026-09-23")] },
    { ...empty, appointments: [visit("today")] },
    { ...empty, appointments: [visit("done", today, { status: "Completed" })] },
    { ...empty, records: [record("old", "2026-08-01")] },
    { ...empty, records: [record("new", today, { new: true })] },
    { ...empty, records: [record("seen")] },
    {
      ...empty,
      healthLinks: {
        self: {
          abha: { address: "patient@abdm", identifier: "12345678901234" },
        },
      },
    },
    ...["Requested", "Confirmed"].map((status) => ({
      ...empty,
      packageRequests: [
        { memberId: "self", status, date: today, itemName: "Health check" },
      ],
    })),
  ];
  const variants = new Set();
  for (const state of scenarios) {
    for (const card of selectCareUpdates(state, "self", today, { config })) {
      variants.add(`${card.id}/${card.variant}`);
      for (const key of ["status", "title", "description", "detail"])
        assert.ok(
          card[key]?.length,
          `${card.id}/${card.variant}: missing ${key}`,
        );
      assert.ok(card.action.label && card.action.path.startsWith("/"));
    }
  }
  const listed = selectCareUpdates(empty, "self", today, {
    config: {
      ...config,
      healthPackages: [{ id: "p", name: "Health check", price: 99 }],
    },
  });
  variants.add(`packages/${listed[3].variant}`);
  assert.deepEqual(
    [...variants].sort(),
    [
      "appointments/welcome",
      "appointments/available",
      "appointments/upcoming",
      "appointments/needs-symptoms",
      "appointments/completed",
      "records/empty",
      "records/history",
      "records/new",
      "records/available",
      "abha/unlinked",
      "abha/linked",
      "packages/empty",
      "packages/available",
      "packages/requested",
      "packages/confirmed",
    ].sort(),
  );
  for (const extra of [
    { symptomIntakeSkipped: true },
    { type: "Video consultation" },
  ]) {
    const card = selectCareUpdates(
      { ...empty, appointments: [visit("ready", today, extra)] },
      "self",
      today,
    )[0];
    assert.equal(card.variant, "upcoming");
    assert.equal(card.action.path, "/appointments?visit=ready");
  }
});
