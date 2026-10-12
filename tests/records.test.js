import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY,
  MEDICAL_RECORD_TYPES,
  normalizeRecord,
} from "../src/patient/services/records.js";
import { initialState } from "../src/shared/data.js";

test("medical record filters and uploads share the four Tatva document types", () => {
  assert.deepEqual(MEDICAL_RECORD_TYPES, [
    "Pathology",
    "Radiology",
    "Prescription",
    "Other",
  ]);
});

test("older and unknown medical types remain accessible under Other without losing their contents", () => {
  for (const type of [
    "Rehabilitation",
    "Procedure notes",
    "External report",
    undefined,
  ]) {
    const saved = Object.freeze({
      id: "uploaded-record",
      memberId: "mother",
      category: CATEGORY.medical,
      type,
      title: "Knee physiotherapy assessment",
      note: "Range of movement and rehabilitation progress recorded.",
      uploaded: true,
      fileName: "assessment.pdf",
      mime: "application/pdf",
      date: "2026-09-20",
    });
    const normalized = normalizeRecord(saved);
    assert.equal(normalized.type, "Other");
    assert.equal(normalized.originalType, type);
    for (const key of Object.keys(saved).filter((key) => key !== "type")) {
      assert.deepEqual(normalized[key], saved[key]);
    }
    assert.equal(saved.type, type);
    assert.deepEqual(normalizeRecord(normalized), normalized);
  }
});

test("supported medical records and unrelated structured records retain their types", () => {
  for (const type of MEDICAL_RECORD_TYPES) {
    const record = { category: CATEGORY.medical, type };
    assert.strictEqual(normalizeRecord(record), record);
  }
  const lab = {
    category: CATEGORY.lab,
    type: "Blood count",
    params: [{ value: 12 }],
  };
  assert.strictEqual(normalizeRecord(lab), lab);
  assert.deepEqual(normalizeRecord({ ...lab, category: "Lab reports" }), lab);
  assert.deepEqual(normalizeRecord({ category: "Scans & imaging" }), {
    category: CATEGORY.medical,
    type: "Radiology",
  });
  assert.deepEqual(normalizeRecord({ category: "Other documents" }), {
    category: CATEGORY.medical,
    type: "Other",
  });
});

test("initial records use supported types and preserve rehabilitation and procedure documents", () => {
  const records = initialState().records;
  for (const record of records.filter(
    (item) => item.category === CATEGORY.medical,
  )) {
    assert.ok(MEDICAL_RECORD_TYPES.includes(record.type), record.id);
  }
  for (const id of [
    "demo-rehab-self",
    "demo-rehab-mother",
    "demo-procedure-mother",
  ]) {
    const record = records.find((item) => item.id === id);
    assert.equal(record.type, "Other");
    assert.ok(record.originalType);
    assert.ok(record.note.length > 80);
  }
});
