import { chooseBrandEvidence } from "./brand-import-ai.js";
import { normalizeCtaGradient } from "../src/shared/brandGradient.js";
export { normalizeCtaGradient } from "../src/shared/brandGradient.js";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";

const MAX_HTML = 1024 * 1024;
const MAX_ASSET = 512 * 1024;
const FONT_NAMES = [
  "Inter",
  "Mulish",
  "Poppins",
  "Nunito Sans",
  "Lato",
  "Open Sans",
  "Roboto",
  "Manrope",
  "DM Sans",
  "Plus Jakarta Sans",
  "Work Sans",
  "Montserrat",
  "Raleway",
  "Source Sans 3",
  "Noto Sans",
  "Outfit",
  "Urbanist",
  "Sora",
  "Merriweather",
  "Playfair Display",
  "Arial",
  "Georgia",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
];
export function publicIPv4(address) {
  if (isIP(address) !== 4) return false;
  const [a, b, c] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export function validateWebsiteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Enter a complete public website URL, such as https://hospital.com.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error(
      "Use a public HTTP or HTTPS website without credentials or a custom port.",
    );
  const host = url.hostname.toLowerCase();
  if (
    !host.includes(".") ||
    /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(host) ||
    (isIP(host) && !publicIPv4(host)) ||
    host.includes(":")
  )
    throw new Error("Only public hospital websites can be analyzed.");
  url.hash = "";
  return url;
}
async function safeFetch(
  value,
  { limit = MAX_HTML, signal, redirects = 0 } = {},
) {
  const url = validateWebsiteUrl(value);
  const addresses = isIP(url.hostname)
    ? [{ address: url.hostname, family: 4 }]
    : await new Promise((resolve, reject) => {
        const abort = () =>
          reject(new Error("The website took too long to respond."));
        signal?.addEventListener("abort", abort, { once: true });
        lookup(url.hostname, { all: true, family: 4 })
          .then(resolve, reject)
          .finally(() => signal?.removeEventListener("abort", abort));
        if (signal?.aborted) abort();
      });
  if (!addresses.length || addresses.some((r) => !publicIPv4(r.address)))
    throw new Error("This website does not resolve to a public address.");
  if (signal?.aborted)
    throw new Error("The website took too long to respond. Try again.");
  const address = addresses[0].address;
  const response = await new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? https : http).get(
      url,
      {
        signal,
        // Pin the validated DNS answer for this connection to prevent rebinding.
        lookup: (_host, options, done) =>
          options.all
            ? done(null, [{ address, family: 4 }])
            : done(null, address, 4),
        headers: {
          "User-Agent": "TatvaPracticeBrandImport/1.0",
          Accept: "text/html,text/css,image/*;q=0.8",
          "Accept-Encoding": "identity",
        },
        timeout: 7000,
      },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          resolve({ redirect: res.headers.location });
          return;
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(new Error(`Website returned HTTP ${res.statusCode}.`));
          return;
        }
        if (
          res.headers["content-encoding"] &&
          res.headers["content-encoding"] !== "identity"
        ) {
          res.resume();
          reject(
            new Error("The website requires an unsupported response encoding."),
          );
          return;
        }
        if (Number(res.headers["content-length"]) > limit) {
          res.destroy();
          reject(new Error("The website response is too large to analyze."));
          return;
        }
        let size = 0;
        const chunks = [];
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > limit) {
            res.destroy();
            reject(new Error("The website response is too large to analyze."));
          } else chunks.push(chunk);
        });
        res.on("end", () =>
          resolve({
            body: Buffer.concat(chunks),
            type: String(res.headers["content-type"] || "").toLowerCase(),
            url: url.href,
          }),
        );
        res.on("error", reject);
      },
    );
    req.on("timeout", () =>
      req.destroy(new Error("The website took too long to respond.")),
    );
    req.on("error", reject);
  });
  if (response.redirect) {
    if (redirects >= 3)
      throw new Error(
        "The website redirects too many times. Enter its final URL.",
      );
    return safeFetch(new URL(response.redirect, url).href, {
      limit,
      signal,
      redirects: redirects + 1,
    });
  }
  return response;
}
const decode = (text) =>
  String(text || "")
    .replace(
      /&(?:amp|quot|apos|lt|gt|#39|#x27);/gi,
      (m) =>
        ({
          "&amp;": "&",
          "&quot;": '"',
          "&apos;": "'",
          "&lt;": "<",
          "&gt;": ">",
          "&#39;": "'",
          "&#x27;": "'",
        })[m.toLowerCase()] || m,
    )
    .trim();
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]{0,8192}>`, "gi"))]
    .slice(0, 200)
    .map(([tag]) =>
      Object.fromEntries(
        [
          ...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
        ].map((m) => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4])]),
      ),
    );
}
function absolute(value, base) {
  try {
    return validateWebsiteUrl(new URL(value, base).href).href;
  } catch {
    return null;
  }
}
function hexColor(value) {
  const rgb = String(value || "")
    .trim()
    .match(
      /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*(1(?:\.0+)?))?\s*\)/i,
    );
  if (rgb && rgb.slice(1, 4).every((v) => Number(v) <= 255))
    return (
      "#" +
      rgb
        .slice(1, 4)
        .map((v) => Number(v).toString(16).padStart(2, "0"))
        .join("")
    );
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
function ctaGradient(css, html) {
  const variables = new Map(
    [...css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)].map((m) => [m[1], m[2]]),
  );
  const resolve = (value) =>
    value?.replace(/var\((--[\w-]+)\)/g, (_, key) => variables.get(key) || "");
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (
      !/(?:\bbutton\b|\.(?:btn|button|cta)(?:[-_.:#\s[]|$)|call-to-action)/i.test(
        rule[1],
      ) ||
      /secondary|disabled|hover|focus|before|after/i.test(rule[1])
    )
      continue;
    const value = rule[2].match(
      /(?:^|;)\s*background(?:-image)?\s*:\s*([^;]+)/i,
    )?.[1];
    const gradient = normalizeCtaGradient(
      resolve(resolve(value))?.replace(/\s*!important\s*$/, ""),
    );
    if (gradient) return gradient;
  }
  for (const button of tags(html, "button")) {
    const value = button.style?.match(
      /(?:^|;)\s*background(?:-image)?\s*:\s*([^;]+)/i,
    )?.[1];
    const gradient = normalizeCtaGradient(resolve(value));
    if (gradient) return gradient;
  }
  return null;
}
// Resolve public CSS tokens before comparing actual CTA backgrounds. Keep a
// bounded depth so cycles and missing variables cannot become guessed colours.
function resolvedCss(css) {
  const variables = new Map(
    [...css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)].map((m) => [
      m[1],
      m[2].trim(),
    ]),
  );
  let result = css;
  for (let i = 0; i < 8; i++) {
    const next = result.replace(
      /var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g,
      (match, key, fallback) => variables.get(key) || fallback || match,
    );
    if (next === result) break;
    result = next;
  }
  return result;
}
function matchedStyles(html, css, tagName) {
  const isCta = tagName === "button";
  const elements = tags(html, tagName).map((a) => ({ ...a, tag: tagName }));
  if (isCta) {
    elements.push(
      ...tags(html, "a")
        .filter(
          (a) =>
            /button|btn|cta|book|appointment|trial|signup/i.test(
              `${a.class || ""} ${a.id || ""}`,
            ) || a.role === "button",
        )
        .map((a) => ({ ...a, tag: "a" })),
    );
  }
  const rows = [];
  for (const [index, m] of [
    ...css.matchAll(/([^{}]+)\{([^{}]*)\}/g),
  ].entries()) {
    for (const selector of m[1].split(",").map((part) => part.trim())) {
      if (
        /hover|focus|disabled|before|after|placeholder|secondary|danger|cookie|dismiss/i.test(
          selector,
        )
      )
        continue;
      const target = selector.split(/[\s>+~]+/).at(-1);
      if (!target || /[:[\]\\]/.test(target)) continue;
      const names = [...target.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
      const id = target.match(/#([\w-]+)/)?.[1];
      const tag = target.match(/^[a-z][\w-]*/i)?.[0];
      if (!names.length && !id && !tag) continue;
      if (
        !elements.some(
          (a) =>
            (!tag || tag === a.tag) &&
            (!id || id === a.id) &&
            names.every((n) => (a.class || "").split(/\s+/).includes(n)),
        )
      )
        continue;
      const score =
        (/(?:primary|book|trial|signup)/i.test(selector) ? 100 : 0) +
        (id ? 50 : 0) +
        names.length * 10 +
        index / 100000;
      rows.push({ selector, body: m[2], score, source: tagName });
    }
  }
  for (const [index, a] of elements.entries()) {
    if (!a.style || /secondary|disabled|cookie|dismiss/i.test(a.class || ""))
      continue;
    const resolved = resolvedCss(`${css} .inline-style { ${a.style} }`);
    rows.push({
      selector: `${a.tag}${a.class ? `.${a.class.split(/\s+/).join(".")}` : ""} (inline)`,
      body: resolved.slice(resolved.lastIndexOf(".inline-style {") + 15, -1),
      score:
        1000 +
        (/cta|btn|primary|book|trial|signup/i.test(
          `${a.class || ""} ${a.id || ""}`,
        )
          ? 2000
          : 0) -
        index,
      source: tagName,
    });
  }
  return rows.sort((a, b) => b.score - a.score);
}
function declaration(rows, property) {
  for (const row of rows) {
    const value = row.body
      .match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i"))?.[1]
      ?.trim();
    if (value && !/inherit|initial|unset|var\(/.test(value))
      return {
        value,
        evidence: `${row.selector.slice(0, 100)} { ${property}: ${value.slice(0, 150)} }`,
      };
  }
  return null;
}
function structuredName(html) {
  for (const m of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const visit = (value, depth = 0) => {
        if (depth > 4 || !value || typeof value !== "object") return null;
        if (
          /Organization|Hospital|MedicalBusiness|MedicalClinic/.test(
            String(value["@type"]),
          ) &&
          typeof value.name === "string"
        )
          return value.name;
        for (const child of Object.values(value)) {
          const found = visit(child, depth + 1);
          if (found) return found;
        }
        return null;
      };
      const name = visit(JSON.parse(m[1]));
      if (name) return name;
    } catch {
      /* Invalid structured metadata is optional. */
    }
  }
  const title = decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]);
  return title.includes("|")
    ? title.split("|").at(-1).trim().slice(0, 80)
    : null;
}
export function foundationalStyles(css) {
  const radius = new Map(),
    shadow = new Map();
  const add = (map, key, count) => map.set(key, (map.get(key) || 0) + count);
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (
      /hover|focus|before|after|tooltip|badge|avatar|textarea|input|select/i.test(
        rule[1],
      )
    )
      continue;
    const selectors = rule[1]
      .split(",")
      .filter((v) =>
        /\bbutton\b|\.(?:btn|button|card|panel)(?:[-_.:#\s[]|$)/i.test(v),
      );
    if (!selectors.length) continue;
    const rounded = rule[2].match(
      /(?:^|;)\s*border-radius\s*:\s*(\d+(?:\.\d+)?)(px|rem)?\s*(?:;|$)/i,
    );
    if (rounded) {
      const n = Number(rounded[1]) * (rounded[2] === "rem" ? 16 : 1);
      if (n <= 24 && n >= 0) add(radius, Math.round(n), selectors.length);
    }
    const elevation = rule[2]
      .match(/(?:^|;)\s*box-shadow\s*:\s*([^;]+)/i)?.[1]
      ?.trim();
    if (elevation === "none") add(shadow, "none", selectors.length);
    else if (elevation && !/var|inset|url/i.test(elevation)) {
      const alpha = Number(
        elevation.match(/rgba\([^)]*,\s*(0?\.\d+)\s*\)/i)?.[1] || 0.15,
      );
      const lengths = elevation
        .replace(/rgba?\([^)]*\)|#[\da-f]{3,8}/gi, "")
        .match(/-?\d+(?:\.\d+)?(?:px)?/g)
        ?.map(parseFloat);
      if (lengths?.length >= 3)
        add(shadow, alpha >= 0.2 ? "defined" : "soft", selectors.length);
    }
  }
  const winner = (map) =>
    [...map]
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
  return { radius: winner(radius), shadowStyle: winner(shadow) };
}
function imageDimensions(bytes, svg, fallback = {}) {
  if (svg) {
    const tag = tags(svg.toString(), "svg")[0] || {};
    const box = (tag.viewbox || "").trim().split(/[ ,]+/).map(Number);
    return {
      width: box.length === 4 ? box[2] : parseFloat(tag.width),
      height: box.length === 4 ? box[3] : parseFloat(tag.height),
    };
  }
  if (rasterType(bytes) === "image/png" && bytes.length >= 24)
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  return { width: Number(fallback.width), height: Number(fallback.height) };
}
export function findLogoCandidates(html, base) {
  const regions = [
    ...html.matchAll(/<(header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi),
  ].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
    place: m[1].toLowerCase(),
  }));
  const result = [];
  const regionAt = (index) =>
    regions.find((r) => index >= r.start && index < r.end)?.place;
  for (const match of html.matchAll(/<img\b[^>]{0,8192}>/gi)) {
    const a = tags(match[0], "img")[0];
    if (!a) continue;
    const marker = `${a.alt || ""} ${a.class || ""} ${a.id || ""} ${a.src || ""}`;
    const place = regionAt(match.index);
    const branded = /logo|wordmark|brand/i.test(marker);
    const context = html.slice(Math.max(0, match.index - 600), match.index);
    const homeLink =
      /<a\b[^>]*href=["'](?:\/|https?:\/\/[^/"']+\/?)["'][^>]*>[^<]*$/i.test(
        context,
      );
    if (!branded && !(place && homeLink)) continue;
    if (/partner|certification|award|badge|social|sponsor/i.test(marker))
      continue;
    const url = absolute(a.src || a["data-src"], base);
    if (!url) continue;
    result.push({
      url,
      width: parseFloat(a.width),
      height: parseFloat(a.height),
      place: place || "page",
      score:
        (branded ? 60 : 0) +
        (place === "header"
          ? 45
          : place === "nav"
            ? 40
            : place === "footer"
              ? 25
              : 0) +
        (homeLink ? 25 : 0),
    });
  }
  for (const match of html.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi)) {
    const a = tags(match[0], "svg")[0] || {};
    const place = regionAt(match.index);
    const context = html.slice(Math.max(0, match.index - 500), match.index);
    const branded = /logo|wordmark|brand/i.test(
      `${a.class || ""} ${a.id || ""} ${a["aria-label"] || ""} ${context.slice(-250)}`,
    );
    const svg = safeSvg(Buffer.from(match[0]));
    if (!svg) continue;
    const dimensions = imageDimensions(null, svg);
    const ratio = dimensions.width / dimensions.height;
    if (!(ratio >= 1.5 && ratio <= 12 && (branded || place))) continue;
    result.push({
      svg: svg.toString(),
      ...dimensions,
      place: place || "page",
      score:
        (branded ? 65 : 0) +
        (place === "header"
          ? 45
          : place === "nav"
            ? 40
            : place === "footer"
              ? 25
              : 0),
    });
  }
  return result
    .sort((a, b) => b.score - a.score)
    .filter(
      (v, i, all) =>
        all.findIndex((x) => (x.url || x.svg) === (v.url || v.svg)) === i,
    )
    .slice(0, 4);
}
export function extractBrand(html, css, base) {
  css = resolvedCss(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  const meta = tags(html, "meta");
  const links = tags(html, "link");
  const candidates = [];
  const add = (key, label, value, evidence) =>
    value && candidates.push({ key, label, value, evidence });
  const name =
    meta.find((m) => m.property === "og:site_name")?.content ||
    meta.find((m) => m.name === "application-name")?.content ||
    structuredName(html);
  add("hospitalName", "Hospital name", name?.slice(0, 120), "Website metadata");
  const colour = (value) => {
    const hex = hexColor(value);
    if (!hex) return null;
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    // Neutral backgrounds and text colours are not evidence of a brand colour.
    return Math.max(...rgb) - Math.min(...rgb) >= 24 ? hex : null;
  };
  const ctaRules = matchedStyles(html, css, "button");
  const bodyRules = matchedStyles(html, css, "body");
  const headingRules = matchedStyles(html, css, "h1");
  const ctaBackground = ctaRules
    .map((row) => declaration([row], "background(?:-color)?"))
    .find((background) => colour(background?.value));
  const ctaOutline = ctaRules
    .map((row) => {
      const border = row.body.match(
        /(?:^|;)\s*border(?:-color)?\s*:[^;]*?(#[\da-f]{3,6})\b/i,
      )?.[1];
      return colour(border)
        ? {
            value: border,
            evidence: `${row.selector.slice(0, 100)} outline colour`,
          }
        : null;
    })
    .find(Boolean);
  const ctaAnchor = ctaRules
    .map((row) => {
      const background = declaration([row], "background(?:-image)?");
      if (!/^linear-gradient\(/i.test(background?.value || "")) return null;
      const anchor = background.value.match(
        /#[\da-f]{6}\b|#[\da-f]{3}\b|rgba?\([^)]*\)/i,
      )?.[0];
      return colour(anchor)
        ? {
            value: colour(anchor),
            evidence: `${row.selector.slice(0, 100)} CTA gradient base colour`,
          }
        : null;
    })
    .find(Boolean);
  const ctaColour = ctaBackground || ctaOutline || ctaAnchor;
  const theme = colour(meta.find((m) => m.name === "theme-color")?.content);
  const primary = [
    ...css.matchAll(
      /--([\w-]*(?:primary|brand)[\w-]*)\s*:\s*(#[\da-f]{3,6})\b/gi,
    ),
  ]
    .filter(
      (m) => !/foreground|text|heading|title|contrast|light|muted/.test(m[1]),
    )
    .map((m) => colour(m[2]))
    .find(Boolean);
  const button = [
    ...css.matchAll(
      /[^{}]*(?:\.btn-primary|\.button-primary|button)[^{}]*\{[^}]*?background(?:-color)?\s*:\s*(#[\da-f]{3,6})\b/gi,
    ),
  ]
    .map((m) => colour(m[1]))
    .find(Boolean);
  add(
    "primary",
    "Primary colour",
    colour(ctaColour?.value) || primary || theme || button,
    colour(ctaColour?.value)
      ? ctaColour.evidence
      : primary
        ? "Primary/brand CSS variable"
        : theme
          ? "Website theme colour"
          : "Button CSS colour",
  );
  add(
    "ctaGradient",
    "Primary button gradient",
    ctaGradient(css, html),
    "Button / call-to-action stylesheet",
  );
  const secondary = [
    ...css.matchAll(
      /--[\w-]*(?:secondary|accent)[\w-]*\s*:\s*(#[\da-f]{3,6})\b/gi,
    ),
  ]
    .map((m) => colour(m[1]))
    .find(Boolean);
  add("accent", "Secondary colour", secondary, "Secondary/accent CSS variable");
  for (const [key, label, rows] of [
    ["textBody", "Body text colour", bodyRules],
    ["textHeading", "Heading text colour", headingRules],
  ]) {
    const text = declaration(rows, "color");
    add(key, label, hexColor(text?.value), text?.evidence);
  }
  const foundation = foundationalStyles(css);
  if (foundation.radius !== undefined)
    candidates.push({
      key: "radius",
      label: "Corner radius",
      value: foundation.radius,
      evidence: "Repeated button/card corner style",
    });
  add(
    "shadowStyle",
    "Shadow style",
    foundation.shadowStyle,
    "Repeated button/card elevation style",
  );
  const styles = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const declared = [...styles.matchAll(/font-family\s*:\s*([^;}]+)/gi)].map(
    (m) => m[1].replace(/["']/g, "").split(",")[0].trim(),
  );
  const fonts = [...new Set(declared)].filter((f) =>
    FONT_NAMES.some((n) => n.toLowerCase() === f.toLowerCase()),
  );
  const headingRule = styles.match(
    /(?:^|})[^{}]*(?:\bh1\b|\bh2\b|\.heading)[^{}]*\{[^}]*?font-family\s*:\s*([^;}]+)/i,
  )?.[1];
  const bodyRule = styles.match(
    /(?:^|})[^{}]*\bbody\b[^{}]*\{[^}]*?font-family\s*:\s*([^;}]+)/i,
  )?.[1];
  const supported = (value) => {
    const variable = value?.match(/var\((--[\w-]+)\)/)?.[1];
    if (variable)
      value = styles.match(new RegExp(variable + "\\s*:\\s*([^;}]+)"))?.[1];
    const f = value?.replace(/["']/g, "").split(",")[0].trim();
    return FONT_NAMES.find((n) => n.toLowerCase() === f?.toLowerCase());
  };
  add(
    "fontBody",
    "Body font",
    supported(declaration(bodyRules, "font-family")?.value || bodyRule) ||
      (fonts.length === 1 ? fonts[0] : null),
    "Public stylesheet font declaration",
  );
  add(
    "fontHeading",
    "Heading font",
    supported(declaration(headingRules, "font-family")?.value || headingRule) ||
      (fonts.length === 1 ? fonts[0] : null),
    "Public stylesheet font declaration",
  );
  const logo = tags(html, "img")
    .filter((a) =>
      /logo/i.test(
        `${a.alt || ""} ${a.class || ""} ${a.id || ""} ${a.src || ""}`,
      ),
    )
    .map((a) => absolute(a.src || a["data-src"], base))
    .filter(Boolean);
  const icon = links
    .filter((a) => /^(apple-touch-icon|icon|shortcut icon)$/i.test(a.rel || ""))
    .sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0))
    .map((a) => absolute(a.href, base))
    .filter(Boolean);
  return {
    manifest: absolute(links.find((a) => a.rel === "manifest")?.href, base),
    candidates,
    logoCandidates: findLogoCandidates(html, base),
    styleEvidence: [...ctaRules, ...bodyRules, ...headingRules].slice(0, 80),
    // Only the first identified site logo; do not substitute a partner/footer brand.
    logos: [...new Set(logo)].slice(0, 1),
    icons: [...new Set(icon)].slice(0, 2),
    stylesheets: links
      .filter((a) => a.rel?.toLowerCase() === "stylesheet")
      .map((a) => absolute(a.href, base))
      .filter(Boolean)
      .slice(0, 4),
    detectedFonts: [...new Set(declared)].slice(0, 8),
  };
}
// Imported SVG stays an image resource; it is never inserted as HTML. Reject
// active content and external references before preserving the vector asset.
export function safeSvg(bytes) {
  const text = bytes
    .toString("utf8")
    .trim()
    .replace(/^<\?xml[^?]*\?>\s*/i, "")
    .replace(/<!--[^]*?-->/g, "")
    .trim();
  if (!/^<svg(?:\s|>)/i.test(text) || !/(?:<\/svg\s*>|\/>)\s*$/i.test(text))
    return null;
  if (
    /xml:base\s*=|<!DOCTYPE|<!ENTITY|&#|<\?|<\s*(?:[\w.-]+:)?(?:script|foreignObject|iframe|object|embed|animate|animateMotion|animateTransform|set)\b|\s(?:[\w.-]+:)?on[\w:-]+\s*=|@import|expression\s*\(|\\/i.test(
      text,
    )
  )
    return null;
  const references = [
    ...text.matchAll(
      /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    ),
  ];
  if (
    references.some((m) => !/^#[\w:.-]+$/.test((m[1] ?? m[2] ?? m[3]).trim()))
  )
    return null;
  const urls = [...text.matchAll(/url\s*\(([^)]*)\)/gi)];
  if (urls.some((m) => !/^['"]?#[\w:.-]+['"]?$/.test(m[1].trim()))) return null;
  return Buffer.from(text);
}
// Conservative early rejection; browser pixel validation is the final check.
export function whiteOnlySvg(svg) {
  const paints = [
    ...svg
      .toString("utf8")
      .matchAll(
        /(?:fill|stroke|stop-color)\s*(?:=\s*["']|:\s*)(#[a-f\d]{3,8}|white|black|rgb\([^)]*\))/gi,
      ),
  ].map((m) => m[1].toLowerCase());
  return (
    paints.length > 0 &&
    paints.every((p) =>
      /^(?:white|#fff|#ffffff|#ffffffff|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))$/.test(
        p,
      ),
    )
  );
}
function rasterType(bytes) {
  if (
    bytes.length > 6 &&
    bytes.readUInt16LE(0) === 0 &&
    bytes.readUInt16LE(2) === 1 &&
    bytes.readUInt16LE(4) > 0 &&
    bytes.readUInt16LE(4) <= 64
  )
    return "image/x-icon";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}
export async function analyzeWebsite(value) {
  const signal = AbortSignal.timeout(25000);
  const page = await safeFetch(value, { signal });
  if (!page.type.includes("text/html"))
    throw new Error("This URL is not a web page. Enter the hospital homepage.");
  const html = page.body.toString("utf8");
  let css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  const initial = extractBrand(html, css, page.url);
  const styles = await Promise.allSettled(
    initial.stylesheets.map((url) =>
      safeFetch(url, { limit: MAX_HTML, signal }),
    ),
  );
  for (const result of styles)
    if (result.status === "fulfilled" && result.value.type.includes("text/css"))
      css += "\n" + result.value.body.toString("utf8");
  const extracted = extractBrand(html, css, page.url);
  const warnings = [];
  if (extracted.manifest) {
    try {
      const manifestFile = await safeFetch(extracted.manifest, {
        limit: 64 * 1024,
        signal,
      });
      const manifest = JSON.parse(manifestFile.body.toString("utf8"));
      const icons = (Array.isArray(manifest.icons) ? manifest.icons : [])
        .filter((icon) => typeof icon.src === "string")
        .sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0))
        .slice(0, 2)
        .map((icon) => absolute(icon.src, manifestFile.url))
        .filter(Boolean);
      extracted.icons = [...new Set([...icons, ...extracted.icons])].slice(
        0,
        3,
      );
    } catch {
      /* Missing manifests do not block homepage evidence. */
    }
  }
  if (!extracted.icons.length)
    extracted.icons = [new URL("/favicon.ico", page.url).href];
  async function getLogo(urls, key, label) {
    for (const url of urls) {
      try {
        const asset = await safeFetch(url, { limit: MAX_ASSET, signal });
        const svg = safeSvg(asset.body);
        const mime = rasterType(asset.body) || (svg ? "image/svg+xml" : null);
        if (!mime || (svg && whiteOnlySvg(svg))) continue;
        const bytes = svg || asset.body;
        extracted.candidates.push({
          key,
          label,
          value: `data:${mime};base64,${bytes.toString("base64")}`,
          evidence: new URL(url).hostname,
        });
        return;
      } catch {
        /* Missing or blocked assets leave this field untouched. */
      }
    }
    if (urls.length)
      warnings.push(
        `${label} could not be imported. Upload a safe SVG, PNG, JPG or WebP manually.`,
      );
  }
  await Promise.all([
    (async () => {
      const found = [];
      for (const candidate of extracted.logoCandidates) {
        try {
          const asset = candidate.svg
            ? { body: Buffer.from(candidate.svg) }
            : await safeFetch(candidate.url, { limit: MAX_ASSET, signal });
          const svg = safeSvg(asset.body);
          const mime = rasterType(asset.body) || (svg ? "image/svg+xml" : null);
          if (!mime || (svg && whiteOnlySvg(svg))) continue;
          const dimensions = imageDimensions(asset.body, svg, candidate);
          const ratio = dimensions.width / dimensions.height;
          if (Number.isFinite(ratio) && (ratio < 1.45 || ratio > 12)) continue;
          found.push({
            ...candidate,
            body: svg || asset.body,
            mime,
            score: candidate.score + (Number.isFinite(ratio) ? 35 : 0),
            ratio,
          });
        } catch {
          /* Keep other public header/footer candidates available. */
        }
      }
      const best = found.sort((a, b) => b.score - a.score)[0];
      if (best)
        extracted.candidates.push({
          key: "logo",
          label: "Horizontal logo",
          value: `data:${best.mime};base64,${best.body.toString("base64")}`,
          evidence: `${best.place === "page" ? "Website" : best.place[0].toUpperCase() + best.place.slice(1)} logo${Number.isFinite(best.ratio) ? ` · ${best.ratio.toFixed(1)}:1 aspect ratio` : ""}`,
        });
      else if (extracted.logoCandidates.length)
        warnings.push(
          "No usable horizontal logo was found. Your current logo stays unchanged.",
        );
    })(),
    getLogo(extracted.icons, "logoMark", "App icon"),
  ]);
  if (styles.some((s) => s.status === "rejected"))
    warnings.push(
      "Some stylesheets could not be read. Review the detected colours and fonts.",
    );
  if (!extracted.candidates.length)
    warnings.push(
      "No supported brand details were found. This site may render its branding with JavaScript; configure the fields manually.",
    );
  const aiOptions = extracted.candidates.map((c, index) => ({
    id: `detected-${index}`,
    allowedKeys: [c.key],
    value: c.value,
    evidence: c.evidence,
  }));
  for (const row of extracted.styleEvidence) {
    for (const match of row.body.matchAll(
      /(?:^|;)\s*(color|background-color|background|font-family)\s*:\s*([^;]+)/gi,
    )) {
      const value = match[2].trim();
      const color = hexColor(value);
      const font = FONT_NAMES.find(
        (n) =>
          n.toLowerCase() ===
          value.replace(/["']/g, "").split(",")[0].trim().toLowerCase(),
      );
      if (color && (match[1] === "color" || row.source === "button"))
        aiOptions.push({
          id: `style-${aiOptions.length}`,
          allowedKeys:
            match[1] === "color"
              ? ["textHeading", "textBody"]
              : extracted.candidates.some((c) => c.key === "primary")
                ? ["accent"]
                : ["primary", "accent"],
          value: color,
          evidence: `${row.selector.slice(0, 100)} { ${match[1]}: ${value.slice(0, 100)} }`,
        });
      if (font)
        aiOptions.push({
          id: `style-${aiOptions.length}`,
          allowedKeys: ["fontBody", "fontHeading"],
          value: font,
          evidence: `${row.selector.slice(0, 100)} { font-family: ${value.slice(0, 100)} }`,
        });
    }
  }
  const ai = await chooseBrandEvidence(aiOptions.slice(0, 160));
  const labels = {
    hospitalName: "Hospital name",
    primary: "Primary colour",
    accent: "Secondary colour",
    fontBody: "Body font",
    fontHeading: "Heading font",
    textBody: "Body text colour",
    textHeading: "Heading text colour",
    ctaGradient: "Primary button gradient",
    radius: "Corner radius",
    shadowStyle: "Shadow style",
    logo: "Horizontal logo",
    logoMark: "App icon",
  };
  for (const selection of ai.selections) {
    const index = extracted.candidates.findIndex(
      (c) => c.key === selection.key,
    );
    const candidate = { ...selection, label: labels[selection.key] };
    if (index >= 0) extracted.candidates[index] = candidate;
    else extracted.candidates.push(candidate);
  }
  return {
    mode: ai.mode,
    detectionNote: ai.message,
    url: page.url,
    candidates: extracted.candidates,
    detectedFonts: extracted.detectedFonts,
    warnings,
  };
}
const rateLimits = new Map();
export async function brandImportHandler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const reply = (status, body) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(405, { error: "Use POST to analyze a website." });
  }
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host)
        return reply(403, { error: "This request must come from this app." });
    } catch {
      return reply(403, { error: "Invalid origin." });
    }
  }
  const key = req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (rateLimits.get(key) || []).filter((t) => now - t < 60000);
  if (recent.length >= 8)
    return reply(429, {
      error: "Please wait a minute before analyzing another website.",
    });
  if (rateLimits.size > 1000) rateLimits.clear();
  rateLimits.set(key, [...recent, now]);
  try {
    let body = req.body;
    if (!body) {
      let data = "";
      for await (const chunk of req) {
        data += chunk;
        if (data.length > 4096)
          return reply(413, { error: "Request too large." });
      }
      body = JSON.parse(data);
    }
    if (typeof body === "string") body = JSON.parse(body);
    if (typeof body?.url !== "string" || body.url.length > 2048)
      return reply(400, { error: "Enter a valid website URL." });
    const result = await analyzeWebsite(body.url);
    reply(200, result);
  } catch (error) {
    reply(400, {
      error:
        error.name === "TimeoutError" || error.name === "AbortError"
          ? "The website took too long to respond. Try again."
          : error.message?.startsWith("getaddrinfo")
            ? "The website could not be found. Check the address and try again."
            : error.message || "The website could not be analyzed.",
    });
  }
}
