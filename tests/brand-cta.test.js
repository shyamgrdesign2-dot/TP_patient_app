import test from "node:test";
import assert from "node:assert/strict";
import { ctaPresentation } from "../src/shared/brandCta.js";
import { validBrand, defaultBrand } from "../src/shared/brand.js";

test("gradients retain exact stops and use dark labels on light colours", () => {
  assert.equal(
    ctaPresentation("linear-gradient(90deg, #112244, #332255)").shade,
    0,
  );
  const light = ctaPresentation("linear-gradient(90deg, #ffffee, #ffeedd)");
  assert.equal(light.shade, 0);
  assert.equal(light.background, "linear-gradient(90deg, #ffffee, #ffeedd)");
  assert.ok(light.background.includes("#ffffee"));
  assert.equal(light.textColor, "#000000");
  assert.equal(light.labelBackground, "transparent");
});

test("unsafe or malformed gradients cannot enter a saved brand", () => {
  for (const ctaGradient of [
    "url(https://example.com/logo)",
    "red; color:black",
    {},
    "linear-gradient(90deg, transparent, white)",
  ]) {
    assert.equal(validBrand({ ...defaultBrand, ctaGradient }), false);
    assert.equal(ctaPresentation(ctaGradient).background, "none");
  }
  assert.ok(
    validBrand({
      ...defaultBrand,
      ctaGradient: "linear-gradient(90deg, #123456, #abcdef)",
      radius: 0,
    }),
  );
});

test("mixed light and dark gradients use a label backing without changing the gradient", () => {
  const value = "linear-gradient(90deg, #000000, #ffffff)";
  const presentation = ctaPresentation(value);
  assert.equal(presentation.background, value);
  assert.equal(presentation.shade, 0);
  assert.notEqual(presentation.labelBackground, "transparent");
});
