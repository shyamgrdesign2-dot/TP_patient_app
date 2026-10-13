import test from "node:test";
import assert from "node:assert/strict";
import {
  accessibleBrandRamp,
  brandContrast,
  mixBrandColor,
  brandForeground,
} from "../src/shared/brandContrast.js";

test("pastel and saturated branding retain the exact primary surface and readable labels", () => {
  for (const raw of [
    "#ffeeaa",
    "#b4eeff",
    "#ffffff",
    "#ffff00",
    "#00ff00",
    "#ff0000",
    "#4b4ad5",
    "#006b64",
    "#000000",
  ]) {
    const palette = accessibleBrandRamp(raw);
    assert.equal(palette[500], raw);
    assert.ok(brandContrast(raw, brandForeground(raw)) >= 4.5);
    assert.equal(palette[50], mixBrandColor(raw, "#ffffff", 0.92));
    assert.equal(palette[100], mixBrandColor(raw, "#ffffff", 0.84));
    for (const surface of [
      "#ffffff",
      "#fafafb",
      "#f1f1f5",
      palette[50],
      palette[100],
      mixBrandColor(palette[500], "#ffffff", 0.84),
    ]) {
      for (const level of [600, 700, 800, 900]) {
        assert.ok(
          brandContrast(palette[level], surface) >= 4.5,
          `${raw} ${level} on ${surface}`,
        );
      }
    }
  }
});

test("invalid imported colours fall back safely without changing saved branding", () => {
  assert.deepEqual(
    accessibleBrandRamp("url(bad)"),
    accessibleBrandRamp("#4b4ad5"),
  );
  assert.deepEqual(
    accessibleBrandRamp(null, "#a461d8"),
    accessibleBrandRamp("#a461d8"),
  );
  assert.equal(accessibleBrandRamp("#006b64")[500], "#006b64");
});
