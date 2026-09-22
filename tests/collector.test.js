import test from "node:test";
import assert from "node:assert/strict";
import { openCollectorSession } from "../src/services/collectorSession.js";
import { updateState } from "../src/state/model.js";
import { initialState } from "../src/services/data.js";

test("symptom notes stay with the active patient's confirmed appointment", () => {
  const state = initialState();
  const visit = state.appointments.find(
    (a) => a.memberId === "self" && a.status === "Confirmed",
  );
  const action = {
    type: "SAVE_SYMPTOMS",
    id: visit.id,
    note: "Symptoms: headache",
    answers: { symptoms: "headache" },
  };
  const next = updateState(state, action);
  assert.equal(
    next.appointments.find((a) => a.id === visit.id).symptomIntake.note,
    action.note,
  );
  assert.throws(
    () => updateState({ ...state, activeMember: "father" }, action),
    /confirmed visit/,
  );
  assert.throws(
    () =>
      updateState(
        { ...state, appointments: [{ ...visit, status: "Cancelled" }] },
        action,
      ),
    /confirmed visit/,
  );
  assert.equal(
    state.appointments.find((a) => a.id === visit.id).symptomIntake,
    undefined,
  );
});

test("collector launch uses a same-origin session service and accepts only the configured HTTPS origin", async () => {
  const previousFetch = globalThis.fetch;
  const options = {
    endpoint: "/api/patient/collector-session",
    origin: "https://collector.example",
    appointment: { externalId: "hospital-visit-1" },
  };
  let responseLink =
    "https://collector.example/symptoms-collector?jwtToken=fixture";
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return { ok: true, json: async () => ({ link: responseLink }) };
  };
  try {
    assert.equal(await openCollectorSession(options), responseLink);
    assert.deepEqual(JSON.parse(requests[0].init.body), {
      appointmentId: "hospital-visit-1",
    });
    assert.equal(requests[0].init.cache, "no-store");
    responseLink = "https://elsewhere.example/symptoms-collector";
    await assert.rejects(openCollectorSession(options), /unsupported/);
    await assert.rejects(
      openCollectorSession({
        ...options,
        endpoint: "https://elsewhere.example/api",
      }),
      /not configured/,
    );
    const count = requests.length;
    await assert.rejects(
      openCollectorSession({ ...options, appointment: { id: "demo" } }),
      /demo visit/,
    );
    assert.equal(requests.length, count);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
