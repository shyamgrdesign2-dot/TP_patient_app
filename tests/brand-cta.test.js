import test from "node:test";
import assert from "node:assert/strict";
import { ctaPresentation } from "../src/shared/brandCta.js";
import { validBrand, defaultBrand } from "../src/shared/brand.js";

test("gradients retain exact stops and default to white labels", () => {
  assert.equal(
    ctaPresentation("linear-gradient(90deg, #112244, #332255)").shade,
    0,
  );
  const light = ctaPresentation("linear-gradient(90deg, #ffffee, #ffeedd)");
  assert.equal(light.shade, 0);
  assert.equal(light.background, "linear-gradient(90deg, #ffffee, #ffeedd)");
  assert.ok(light.background.includes("#ffffee"));
  assert.equal(light.textColor, "#ffffff");
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

test("mixed light and dark gradients retain the brand fill and white text", () => {
  const value = "linear-gradient(90deg, #000000, #ffffff)";
  const presentation = ctaPresentation(value);
  assert.equal(presentation.background, value);
  assert.equal(presentation.shade, 0);
  assert.equal(presentation.labelBackground, "transparent");
  assert.equal(presentation.textColor, "#ffffff");
});

test("CTA text override is explicit, validated and works on solid and gradient buttons", () => {
  assert.equal(ctaPresentation("", "#176b55", "#ffeedd").textColor, "#ffeedd");
  const gradient = ctaPresentation(
    "linear-gradient(90deg, #000000, #ffffff)",
    "#176b55",
    "#123456",
  );
  assert.equal(gradient.textColor, "#123456");
  assert.equal(gradient.labelBackground, "transparent");
  assert.ok(validBrand({ ...defaultBrand, ctaTextColor: "#123456" }));
  assert.equal(
    validBrand({ ...defaultBrand, ctaTextColor: "red;display:none" }),
    false,
  );
});

test("solid CTAs default to white for every primary colour", () => {
  for (const primary of ["#000000", "#ffffff", "#4b4ad5", "#00a5a5"]) {
    assert.equal(ctaPresentation("", primary).textColor, "#ffffff");
  }
});
