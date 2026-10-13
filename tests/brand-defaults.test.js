import test from "node:test";
import assert from "node:assert/strict";
import { defaultBrand, restoreSavedBrand } from "../src/shared/brand.js";

test("returning Tatva browsers adopt the new app icon without resetting their theme", () => {
  const legacy = {
    ...defaultBrand,
    defaultIconVersion: undefined,
    hospitalName: "Tatva Care Hospital",
    logo: "",
    logoMark: "",
    primary: "#123456",
  };
  const restored = restoreSavedBrand(legacy);
  assert.equal(restored.logoMark, "/brand/tatvapractice-app-icon.png");
  assert.equal(restored.primary, "#123456");
  assert.equal(restored.hospitalName, legacy.hospitalName);
  assert.equal(restored.defaultIconVersion, 1);
  assert.deepEqual(restoreSavedBrand(restored), restored);
});

test("icon migration preserves custom artwork, other hospitals and deliberate removals", () => {
  for (const custom of [
    { logoMark: "data:image/png;base64,custom" },
    { logo: "https://hospital.example/logo.svg", logoMark: "" },
    { hospitalName: "City Hospital", logo: "", logoMark: "" },
    { defaultIconVersion: 1, logo: "", logoMark: "" },
  ]) {
    const saved = { ...defaultBrand, defaultIconVersion: undefined, ...custom };
    assert.equal(restoreSavedBrand(saved).logoMark, saved.logoMark);
    assert.equal(restoreSavedBrand(saved).logo, saved.logo);
  }
});
