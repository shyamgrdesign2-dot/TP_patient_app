function hexColor(value) {
  const match = String(value || "")
    .trim()
    .match(/^#([\da-f]{3}|[\da-f]{6})\b/i);
  if (!match) return null;
  const h = match[1];
  return (
    "#" +
    (h.length === 3
      ? h
          .split("")
          .map((v) => v + v)
          .join("")
      : h
    ).toLowerCase()
  );
}
export function normalizeCtaGradient(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 500 ||
    /url|var|expression|[{};\\]/i.test(value)
  )
    return null;
  const match = value.trim().match(/^linear-gradient\((.*)\)$/i);
  if (!match) return null;
  const pieces = match[1].split(/,(?![^()]*\))/).map((v) => v.trim());
  const directions = {
    "to right": "90deg",
    "to left": "270deg",
    "to bottom": "180deg",
    "to top": "0deg",
    "to bottom right": "135deg",
    "to top right": "45deg",
    "to bottom left": "225deg",
    "to top left": "315deg",
  };
  let angle = "180deg";
  if (directions[pieces[0]]) angle = directions[pieces.shift()];
  else if (/^-?\d+(?:\.\d+)?deg$/.test(pieces[0])) {
    const n = parseFloat(pieces.shift());
    if (Math.abs(n) > 360) return null;
    angle = `${n}deg`;
  }
  if (pieces.length < 2 || pieces.length > 4) return null;
  const stops = pieces.map((part) => {
    const stop = part.match(
      /^(#[\da-f]{3}(?:[\da-f]{3})?|rgba?\([\d.,%\s]+\))(?:\s+(\d+(?:\.\d+)?)%)?$/i,
    );
    if (!stop || (stop[2] && +stop[2] > 100)) return null;
    let color = hexColor(stop[1]);
    if (!color) {
      const rgb = stop[1]
        .match(/^rgba?\((.*)\)$/i)?.[1]
        .split(",")
        .map((v) => v.trim());
      if (
        !rgb ||
        rgb.length < 3 ||
        rgb.length > 4 ||
        rgb.some((v) => !/^\d+(?:\.\d+)?$/.test(v))
      )
        return null;
      if (rgb.slice(0, 3).some((v) => +v > 255) || (rgb[3] && +rgb[3] !== 1))
        return null;
      color =
        rgb.length === 4
          ? `rgba(${rgb.slice(0, 3).map(Number).join(", ")}, ${Number(rgb[3])})`
          : "#" +
            rgb
              .map((v) => Math.round(+v).toString(16).padStart(2, "0"))
              .join("");
    }
    return color + (stop[2] ? ` ${Number(stop[2])}%` : "");
  });
  return stops.every(Boolean)
    ? `linear-gradient(${angle}, ${stops.join(", ")})`
    : null;
}
