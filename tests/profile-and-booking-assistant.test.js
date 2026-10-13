import test from "node:test";
import assert from "node:assert/strict";
import {
  ageLabel,
  ageParts,
  dobFromAge,
  profileProblem,
} from "../src/shared/age.js";
import {
  createSession,
  greeting,
  respond,
  extract,
  addDays,
  VIDEO,
  IN_PERSON,
} from "../src/patient/components/booking/bookingScript.js";

const now = new Date("2026-10-12T10:00:00");

test("age shows months for infants and never 0 yrs for an adult relation", () => {
  assert.equal(
    ageLabel({ dob: "1962-11-08", relation: "Father" }, now),
    "63 yrs",
  );
  assert.equal(
    ageLabel({ dob: "2026-03-12", relation: "Son" }, now),
    "7 months",
  );
  assert.equal(
    ageLabel({ dob: "2025-06-12", relation: "Daughter" }, now),
    "1 yr 4 mos",
  );
  assert.equal(
    ageLabel({ dob: "2026-10-02", relation: "Son" }, now),
    "10 days",
  );
  // A parent entered with this year's date is bad data: no age, not "0 yrs".
  assert.equal(ageLabel({ dob: "2026-10-01", relation: "Father" }, now), "");
  assert.equal(ageLabel({ dob: "", relation: "Father" }, now), "");
  assert.equal(ageParts("2027-01-01", now), null);
});

test("an age is stored as a derived date of birth that reads back as the same age", () => {
  const dob = dobFromAge(45, 0, now);
  assert.equal(dob, "1981-10-12");
  assert.deepEqual(
    [ageParts(dob, now).years, ageParts(dob, now).months],
    [45, 0],
  );
  const infant = dobFromAge(0, 7, now);
  assert.equal(ageLabel({ dob: infant, relation: "Son" }, now), "7 months");
});

test("profiles need name, relationship, birth or age, gender and mobile", () => {
  const ok = {
    name: "Kabir",
    relation: "Nephew",
    dob: "2020-01-01",
    gender: "Male",
    phone: "9000000009",
  };
  assert.equal(profileProblem(ok), "");
  assert.match(profileProblem({ ...ok, relation: "" }), /relationship/);
  assert.match(profileProblem({ ...ok, dob: "" }), /date of birth or an age/);
  assert.match(
    profileProblem({ ...ok, gender: "Prefer not to say" }),
    /gender/,
  );
  assert.match(profileProblem({ ...ok, phone: "12345" }), /mobile/);
  assert.match(
    profileProblem({ ...ok, relation: "Father", dob: dobFromAge(0, 3) }),
    /too young for a father/,
  );
});

const ctx = (over = {}) => ({
  doctor: {
    id: "meera",
    name: "Dr. Meera Iyer",
    specialty: "General medicine",
  },
  members: [
    { id: "self", name: "Aarav Sharma", relation: "Self" },
    { id: "father", name: "Rajesh Sharma", relation: "Father" },
    { id: "mother", name: "Sunita Sharma", relation: "Mother" },
  ],
  activeMemberId: "self",
  videoEnabled: true,
  today: "2026-10-12",
  firstDay: 1,
  lastDay: 90,
  slots: ["09:00 AM", "10:30 AM", "04:00 PM", "05:30 PM", "06:00 PM"],
  openSlots: () => ["09:00 AM", "10:30 AM", "04:00 PM", "05:30 PM", "06:00 PM"],
  ...over,
});

test("assistant greets with the doctor and walks patient, type, day, time, summary", () => {
  const c = ctx();
  let { session, turn } = greeting(c, createSession(c));
  assert.match(turn.text, /Dr\. Meera Iyer/);
  assert.match(turn.text, /Who is this visit for\?/);
  assert.deepEqual(
    turn.chips.map((x) => x.label),
    [
      "Myself (Aarav)",
      "Rajesh (Father)",
      "Sunita (Mother)",
      "Add family member",
    ],
  );
  ({ session } = respond(session, "for my father", c));
  assert.equal(session.memberId, "father");
  assert.equal(session.stage, "type");
  ({ session, turn } = respond(session, "video", c));
  assert.equal(session.type, VIDEO);
  assert.equal(turn.chips[0].label, "Tomorrow");
  ({ session, turn } = respond(session, "tomorrow evening", c));
  assert.equal(session.date, "2026-10-13");
  assert.deepEqual(
    turn.chips.map((x) => x.label),
    ["05:30 PM", "06:00 PM"],
  );
  ({ session, turn } = respond(session, "5:30", c));
  assert.equal(session.time, "05:30 PM");
  assert.equal(session.stage, "confirm");
  assert.equal(turn.summary, true);
  assert.equal(respond(session, "yes please", c).confirm, true);
});

test("assistant reads a whole request at once and re-asks politely when lost", () => {
  const c = ctx();
  const start = greeting(c, createSession(c)).session;
  const all = respond(start, "Video visit for my mom on Friday at 4 pm", c);
  assert.deepEqual(
    [
      all.session.memberId,
      all.session.type,
      all.session.date,
      all.session.time,
    ],
    ["mother", VIDEO, "2026-10-16", "04:00 PM"],
  );
  assert.equal(all.session.stage, "confirm");
  const lost = respond(start, "purple elephants", c);
  assert.equal(lost.session.stage, "member");
  assert.match(lost.turn.text, /Sorry, I didn’t catch who this is for/);
  assert.match(lost.turn.text, /Who is this visit for\?/);
});

test("assistant respects the video switch, the booking window and open slots", () => {
  const off = ctx({ videoEnabled: false });
  let s = createSession(off);
  assert.equal(s.type, IN_PERSON);
  let r = respond({ ...s, memberId: "self" }, "video call please", off);
  assert.equal(r.session.type, IN_PERSON);
  assert.match(r.turn.text, /aren’t available/);
  const c = ctx({
    openSlots: (date) => (date === "2026-10-13" ? ["09:00 AM"] : []),
  });
  s = { ...createSession(c), memberId: "self", type: IN_PERSON, stage: "day" };
  r = respond(s, "today", c);
  assert.equal(r.session.date, null);
  assert.match(r.turn.text, /earliest I can do is tomorrow/);
  r = respond(s, "14 oct", c);
  assert.equal(r.session.date, null);
  assert.match(r.turn.text, /no open times/);
  r = respond(s, "tomorrow at 4pm", c);
  assert.equal(r.session.date, "2026-10-13");
  assert.equal(r.session.time, null);
  assert.match(r.turn.text, /04:00 PM is no longer open tomorrow/);
  assert.deepEqual(
    r.turn.chips.map((x) => x.label),
    ["09:00 AM"],
  );
});

test("free text is parsed leniently", () => {
  const c = ctx();
  assert.equal(
    extract("day after tomorrow", c, "day").date,
    addDays(c.today, 2),
  );
  assert.equal(extract("20 Oct", c, "day").date, "2026-10-20");
  assert.equal(extract("next monday morning", c, "day").date, "2026-10-19");
  assert.equal(extract("next monday morning", c, "day").part, "Morning");
  assert.equal(extract("16:00", c, "time").time, "04:00 PM");
  assert.equal(extract("10.30 am", c, "time").time, "10:30 AM");
  assert.equal(extract("in person", c, "type").type, IN_PERSON);
  assert.equal(extract("Sunita", c, "member").memberId, "mother");
  assert.equal(extract("for me", c, "member").memberId, "self");
});

test("packages are off by default; older saved configs are switched off once", async () => {
  const store = new Map();
  const previous = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
  });
  try {
    const { readAdminConfig, writeAdminConfig } =
      await import("../src/shared/hospitalConfig.js");
    const { packagesEnabled } = await import("../src/shared/catalog.js");
    assert.equal(packagesEnabled(readAdminConfig()), false);
    // Saved before the default changed: forced off and stamped.
    store.set(
      "tatva-admin-config",
      JSON.stringify({ features: { packages: true, bills: false } }),
    );
    let config = readAdminConfig();
    assert.equal(config.features.packages, false);
    assert.equal(config.features.bills, false);
    assert.equal(config.configVersion, 2);
    // The hospital switches it on afterwards: it stays on.
    writeAdminConfig({
      ...config,
      features: { ...config.features, packages: true },
    });
    config = readAdminConfig();
    assert.equal(packagesEnabled(config), true);
    assert.equal(packagesEnabled(readAdminConfig()), true);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: previous,
    });
  }
});

test("general booking begins in chat and chooses a doctor before appointment details", () => {
  const doctor = ctx().doctor;
  const c = ctx({ doctor: undefined, doctors: [doctor] });
  let reply = greeting(c, createSession(c));
  assert.equal(reply.session.stage, "doctor");
  assert.match(reply.turn.text, /Which doctor or specialty/);
  reply = respond(reply.session, "general medicine", c);
  assert.equal(reply.session.doctorId, "meera");
  assert.equal(reply.session.stage, "member");
  reply = respond(reply.session, "for me", c);
  assert.equal(reply.session.stage, "type");
  assert.match(reply.turn.text, /Dr. Meera Iyer/);
});
