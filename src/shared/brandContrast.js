const hexPattern = /^#[0-9a-f]{6}$/i;
const rgb = (hex) =>
  [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
const toHex = (values) =>
  `#${values.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
export function mixBrandColor(color, other, amount) {
  const target = rgb(other);
  return toHex(
    rgb(color).map((value, index) => value + (target[index] - value) * amount),
  );
}
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
};
export function brandContrast(first, second) {
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// The primary surface is always the exact brand colour. Darker shades are
// reserved for readable text on white and soft surfaces.
export function accessibleBrandRamp(value, fallback = "#4b4ad5") {
  const base = hexPattern.test(value) ? value.toLowerCase() : fallback;
  const shades = Object.fromEntries(
    [
      [50, 0.92],
      [100, 0.84],
      [200, 0.68],
      [300, 0.48],
    ].map(([key, amount]) => [key, mixBrandColor(base, "#ffffff", amount)]),
  );
  let functional = base;
  for (let step = 0; step <= 255; step++) {
    functional = mixBrandColor(base, "#000000", step / 255);
    // Tesseract tonal hover surfaces mix 16% of the functional shade.
    const backgrounds = [
      "#ffffff",
      "#fafafb",
      "#f1f1f5",
      shades[50],
      shades[100],
      mixBrandColor(functional, "#ffffff", 0.84),
    ];
    if (
      backgrounds.every(
        (background) => brandContrast(functional, background) >= 4.5,
      )
    )
      break;
  }
  return {
    ...shades,
    400: mixBrandColor(base, "#ffffff", 0.24),
    500: base,
    600: mixBrandColor(functional, "#000000", 0.16),
    700: mixBrandColor(functional, "#000000", 0.32),
    800: mixBrandColor(functional, "#000000", 0.48),
    900: mixBrandColor(functional, "#000000", 0.62),
  };
}

export function brandForeground(value) {
  const base = hexPattern.test(value) ? value : "#4b4ad5";
  return brandContrast(base, "#ffffff") >= brandContrast(base, "#000000")
    ? "#ffffff"
    : "#000000";
}
