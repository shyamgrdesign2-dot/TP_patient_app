// Logos render as image resources on white surfaces. Adjust only white paint;
// preserve brand colours, transparency, masks and clipping geometry.
export function svgForWhiteBackground(svg) {
  const protectedParts = [];
  const white =
    /^(?:white|#fff(?:fff)?|rgb\(\s*255\s*[, ]\s*255\s*[, ]\s*255\s*\))$/i;
  let result = svg.replace(
    /<(mask|clipPath)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (part) => {
      protectedParts.push(part);
      return `<!--logo-protected-${protectedParts.length - 1}-->`;
    },
  );
  result = result
    .replace(
      /\b(fill|stroke|color)\s*=\s*(["'])([^"']+)\2/gi,
      (match, property, quote, value) =>
        white.test(value.trim())
          ? `${property}=${quote}#243247${quote}`
          : match,
    )
    .replace(
      /\b(fill|stroke|color)\s*:\s*([^;}"']+)/gi,
      (match, property, value) =>
        white.test(value.trim()) ? `${property}:#243247` : match,
    );
  return result.replace(
    /<!--logo-protected-(\d+)-->/g,
    (_, index) => protectedParts[Number(index)],
  );
}
const cache = new Map();
export function logoForWhiteBackground(src) {
  if (!src?.startsWith("data:image/svg+xml")) return src;
  if (cache.has(src)) return cache.get(src);
  try {
    const comma = src.indexOf(",");
    const svg = src.slice(0, comma).includes(";base64")
      ? new TextDecoder().decode(
          Uint8Array.from(atob(src.slice(comma + 1)), (c) => c.charCodeAt(0)),
        )
      : decodeURIComponent(src.slice(comma + 1));
    const adjusted = svgForWhiteBackground(svg);
    const result =
      adjusted === svg
        ? src
        : `data:image/svg+xml,${encodeURIComponent(adjusted)}`;
    if (cache.size > 40) cache.clear();
    cache.set(src, result);
    return result;
  } catch {
    return src;
  }
}
