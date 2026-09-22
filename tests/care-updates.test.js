import test from "node:test";
import assert from "node:assert/strict";
import { selectCareUpdates } from "../src/services/careUpdates.js";
const today = "2026-09-22";
const empty = { appointments: [], records: [], bills: [] };
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
const bill = (id, date = today, extra = {}) => ({
  id,
  date,
  memberId: "self",
  status: "Unpaid",
  amount: 700,
  ...extra,
});
test("empty, stale, cancelled, paid and unreleased entities never create filler cards", () => {
  assert.equal(selectCareUpdates(empty, "self", today)[0].id, "welcome");
  const cards = selectCareUpdates(
    {
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
      bills: [
        bill("paid", today, { status: "Paid" }),
        bill("old", "2026-08-01"),
      ],
    },
    "self",
    today,
  );
  assert.deepEqual(cards, []);
});
test("urgent patient information is ranked, deduplicated and isolated by profile", () => {
  const data = {
    appointments: [
      visit("late", today, { time: "12:30 PM" }),
      visit("other", today, { memberId: "father", time: "08:00 AM" }),
      visit("next", today, {
        queue: { checkedIn: true, token: "A-012", ahead: 3, minutes: 18 },
      }),
      visit("completed", "2026-09-20", { status: "Completed" }),
    ],
    records: [
      record("seen", today),
      record("unread", "2026-09-21", { new: true }),
      record("other", today, { memberId: "father", new: true }),
    ],
    bills: [bill("new"), bill("other", today, { memberId: "father" })],
  };
  const before = JSON.stringify(data);
  const cards = selectCareUpdates(data, "self", today);
  assert.deepEqual(
    cards.map((card) => card.id),
    ["appointments", "records", "payments", "completed"],
  );
  assert.equal(cards[0].entityId, "next");
  assert.match(cards[0].action.path, /^\/assistant\?appointment=/);
  assert.equal(cards[0].action.label, "Add symptoms");
  assert.equal(cards[1].entityId, "unread");
  assert.equal(cards[2].title, "₹700 outstanding");
  assert.equal(cards[3].action.path, "/appointments?visit=completed");
  assert.equal(JSON.stringify(data), before);
});
test("visibility windows have clear boundaries and payment removes resolved cards", () => {
  const data = {
    appointments: [
      visit("next", "2026-10-22"),
      visit("done", "2026-08-23", { status: "Completed" }),
    ],
    records: [record("recent", "2026-09-15")],
    bills: [
      bill("recent", "2026-09-08"),
      bill("overdue", "2026-08-01", { dueDate: "2026-09-21" }),
    ],
  };
  assert.equal(selectCareUpdates(data, "self", today).length, 4);
  const after = selectCareUpdates(
    {
      ...data,
      appointments: [],
      records: [],
      bills: data.bills.map((item) => ({ ...item, status: "Paid" })),
    },
    "self",
    today,
  );
  assert.deepEqual(after, []);
  assert.equal(
    selectCareUpdates(
      {
        ...empty,
        records: [
          record("published", "2025-01-01", {
            publishedAt: "2026-09-22T10:00:00Z",
          }),
        ],
      },
      "self",
      today,
    ).length,
    1,
  );
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

test("queue colours reflect wait thresholds; first visits and video visits have appropriate actions", () => {
  const queue = { checkedIn: true, token: "A-012", ahead: 3, minutes: 30 };
  const data = { ...empty, appointments: [visit("q", today, { queue })] };
  assert.equal(selectCareUpdates(data, "self", today)[0].tone, "success");
  queue.minutes = 31;
  assert.equal(selectCareUpdates(data, "self", today)[0].tone, "warning");
  queue.expectedMinutes = 40;
  assert.equal(selectCareUpdates(data, "self", today)[0].tone, "success");
  assert.equal(
    selectCareUpdates(empty, "new-member", today)[0].state,
    "welcome",
  );
  assert.equal(
    selectCareUpdates(
      {
        ...empty,
        appointments: [visit("video", today, { type: "Video consultation" })],
      },
      "self",
      today,
    )[0].action.path,
    "/appointments?visit=video",
  );
});
test("all event combinations are unique, ranked and scoped to the patient", () => {
  for (let mask = 0; mask < 16; mask++) {
    const data = {
      appointments: [
        ...(mask & 1 ? [visit("next")] : []),
        ...(mask & 8
          ? [visit("done", "2026-09-20", { status: "Completed" })]
          : []),
      ],
      records: mask & 2 ? [record("r", today, { new: true })] : [],
      bills: mask & 4 ? [bill("b")] : [],
    };
    const cards = selectCareUpdates(data, "self", today);
    assert.equal(
      cards.length,
      mask === 0 ? 1 : mask.toString(2).replaceAll("0", "").length,
    );
    assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
    assert.ok(cards.every((c) => c.memberId === "self"));
    assert.ok(
      cards.every((c, i) => i === 0 || c.priority >= cards[i - 1].priority),
    );
    assert.equal(selectCareUpdates(data, "father", today)[0].state, "welcome");
  }
});
