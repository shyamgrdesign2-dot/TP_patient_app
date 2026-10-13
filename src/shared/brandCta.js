import { normalizeCtaGradient } from "./brandGradient.js";
import { brandForeground } from "./brandContrast.js";

// Preserve every gradient stop. Contrast is handled by the label, never a
// dark overlay on the hospital's colours.
export function ctaPresentation(value, primary = "#4b4ad5") {
  const gradient = normalizeCtaGradient(value);
  if (!gradient)
    return {
      background: "none",
      textColor: brandForeground(primary),
      shade: 0,
      labelBackground: "transparent",
    };
  const colors = [...gradient.matchAll(/#[\da-f]{6}|rgba?\([^)]+\)/gi)].map(
    ([color]) =>
      color.startsWith("#")
        ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
        : color
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number),
  );
  const luminance = (rgb) => {
    const c = rgb.map((v) => {
      const n = v / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  let white = 21,
    black = 21;
  for (let i = 1; i < colors.length; i++) {
    for (let step = 0; step <= 20; step++) {
      const light = luminance(
        colors[i - 1].map((v, j) => v + ((colors[i][j] - v) * step) / 20),
      );
      white = Math.min(white, 1.05 / (light + 0.05));
      black = Math.min(black, (light + 0.05) / 0.05);
    }
  }
  const textColor = white >= black ? "#ffffff" : "#000000";
  return {
    background: gradient,
    textColor,
    shade: 0,
    labelBackground:
      Math.max(white, black) >= 4.5
        ? "transparent"
        : textColor === "#ffffff"
          ? "#000000"
          : "#ffffff",
  };
}
