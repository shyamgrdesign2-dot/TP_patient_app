import { normalizeCtaGradient } from "./brandGradient.js";

// Keep brand fills exact. CTA labels start white and can be edited separately.
export function ctaPresentation(value, primary = "#4b4ad5", textOverride = "") {
  return {
    background: normalizeCtaGradient(value) || "none",
    textColor: /^#[0-9a-f]{6}$/i.test(textOverride) ? textOverride : "#ffffff",
    shade: 0,
    labelBackground: "transparent",
  };
}
