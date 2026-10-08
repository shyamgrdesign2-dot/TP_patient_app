import test from "node:test";
import assert from "node:assert/strict";
import { needsSymptoms } from "../src/patient/services/symptomReminders.js";
import {
  validateAgentLink,
  readAgentStatus,
} from "../src/patient/services/agentSession.js";

test("pending symptoms remain actionable after skipping", () => {
  const visit = { status: "Confirmed" };
  assert.equal(needsSymptoms(visit), true);
  assert.equal(needsSymptoms({ ...visit, symptomIntakeSkipped: true }), true);
  assert.equal(
    needsSymptoms({ ...visit, symptomIntake: { note: "Headache" } }),
    false,
  );
  assert.equal(
    needsSymptoms({ ...visit, symptomCollectorStatus: "completed" }),
    false,
  );
  assert.equal(needsSymptoms({ ...visit, status: "Cancelled" }), false);
});

test("collector opens the upstream conversation preserving signed context and rejects foreign links", () => {
  const link = validateAgentLink(
    "https://collector.example/symptoms-collector?jwtToken=fixture",
    "https://collector.example",
    "symptoms",
    "chat",
  );
  assert.equal(
    link,
    "https://collector.example/symptoms-collector-conversation?jwtToken=fixture&type=chat",
  );
  for (const url of [
    "https://elsewhere.example/symptoms-collector",
    "http://collector.example/symptoms-collector",
    "https://collector.example/unknown",
    "https://user:pass@collector.example/symptoms-collector",
  ])
    assert.throws(() =>
      validateAgentLink(url, "https://collector.example", "symptoms", "chat"),
    );
});
test("closing a collector cannot mark another or unfinished appointment completed", async () => {
  const previous = globalThis.fetch;
  let data = { appointmentId: "different", status: "completed" };
  globalThis.fetch = async () => ({ ok: true, json: async () => data });
  try {
    assert.equal(await readAgentStatus("/api/status", "visit"), false);
    data = { appointmentId: "visit", status: "in_progress" };
    assert.equal(await readAgentStatus("/api/status", "visit"), false);
    data.status = "completed";
    assert.equal(await readAgentStatus("/api/status", "visit"), true);
  } finally {
    globalThis.fetch = previous;
  }
});
