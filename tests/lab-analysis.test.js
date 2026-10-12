import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeReport,
  classify,
  concerningSummary,
  filterParams,
  formatValue,
  markerPosition,
  rangeLabel,
  statusLabel,
  STATUS,
} from "../src/shared/labAnalysis.js";

const glucose = {
  id: "fbg",
  name: "Glucose, fasting",
  unit: "mg/dL",
  low: 70,
  high: 100,
};

test("values are read against the ideal range with a borderline band inside it", () => {
  assert.deepEqual(classify({ ...glucose, value: 50 }), {
    status: STATUS.out,
    direction: "low",
  });
  assert.deepEqual(classify({ ...glucose, value: 112 }), {
    status: STATUS.out,
    direction: "high",
  });
  assert.deepEqual(classify({ ...glucose, value: 85 }), {
    status: STATUS.normal,
    direction: null,
  });
  // On the limit, or within a tenth of the range of it, is borderline.
  assert.deepEqual(classify({ ...glucose, value: 100 }), {
    status: STATUS.borderline,
    direction: "high",
  });
  assert.deepEqual(classify({ ...glucose, value: 72 }), {
    status: STATUS.borderline,
    direction: "low",
  });
  // A missing value never raises an alarm.
  assert.equal(classify({ ...glucose, value: "" }).status, STATUS.normal);
});

test("one-sided ranges only check the bound they have", () => {
  const ldl = { name: "LDL", unit: "mg/dL", low: null, high: 100 };
  assert.equal(classify({ ...ldl, value: 142 }).status, STATUS.out);
  assert.equal(classify({ ...ldl, value: 60 }).status, STATUS.normal);
  assert.equal(classify({ ...ldl, value: 95 }).status, STATUS.borderline);
  const hdl = { name: "HDL", unit: "mg/dL", low: 40, high: null };
  assert.equal(classify({ ...hdl, value: 90 }).status, STATUS.normal);
  assert.equal(classify({ ...hdl, value: 42 }).status, STATUS.borderline);
  assert.equal(classify({ ...hdl, value: 30 }).direction, "low");
  assert.equal(rangeLabel(ldl), "Below 100");
  assert.equal(rangeLabel(hdl), "Above 40");
  assert.equal(rangeLabel(glucose), "70 – 100");
});

test("the marker sits in the middle band for ideal values and in the margins beyond", () => {
  assert.equal(markerPosition({ ...glucose, value: 70 }), 25);
  assert.equal(markerPosition({ ...glucose, value: 100 }), 75);
  assert.equal(markerPosition({ ...glucose, value: 85 }), 50);
  assert.equal(markerPosition({ ...glucose, value: 55 }), 12.5);
  assert.equal(markerPosition({ ...glucose, value: 115 }), 87.5);
  // Far outside the range the marker stops at the bar's edge.
  assert.equal(markerPosition({ ...glucose, value: 500 }), 98);
  assert.equal(markerPosition({ ...glucose, value: -40 }), 2);
});

test("a report is summarised by what needs attention", () => {
  const report = {
    params: [
      { ...glucose, value: 112 },
      { id: "a1c", name: "HbA1c", unit: "%", low: 4, high: 5.6, value: 5.6 },
      {
        id: "pp",
        name: "Glucose, post-prandial",
        unit: "mg/dL",
        low: 70,
        high: 140,
        value: 120,
      },
    ],
  };
  const analysis = analyzeReport(report);
  assert.deepEqual(analysis.counts, { all: 3, borderline: 1, out: 1 });
  assert.deepEqual(
    analysis.concerning.map((p) => p.id),
    ["fbg", "a1c"],
  );
  assert.deepEqual(
    filterParams(analysis.params, STATUS.out).map((p) => p.id),
    ["fbg"],
  );
  assert.deepEqual(
    filterParams(analysis.params, "all", "glucose").map((p) => p.id),
    ["fbg", "pp"],
  );
  assert.deepEqual(
    filterParams(analysis.params, STATUS.borderline, "post"),
    [],
  );
  assert.equal(concerningSummary(2), "2 parameters are concerning");
  assert.equal(concerningSummary(1), "1 parameter is concerning");
  assert.equal(concerningSummary(0), "All parameters are within range");
  assert.equal(statusLabel(analysis.params[0]), "Out of ideal range");
  assert.equal(statusLabel(analysis.params[1]), "Borderline high");
  assert.equal(statusLabel(analysis.params[2]), "Within ideal range");
  // No parameters: nothing to analyse, nothing to alarm.
  assert.deepEqual(analyzeReport({}).counts, { all: 0, borderline: 0, out: 0 });
  assert.deepEqual(analyzeReport(undefined).concerning, []);
});

test("large counts read with Indian digit grouping", () => {
  assert.equal(formatValue({ value: 245000 }), "2,45,000");
  assert.equal(formatValue({ value: 14.2 }), "14.2");
  assert.equal(formatValue({ value: 160000, display: "1.6 lakh" }), "1.6 lakh");
});
