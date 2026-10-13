import { parseHTML } from "linkedom";
import { svgForWhiteBackground } from "../src/shared/logoContrast.js";
import { chooseBrandEvidence } from "./brand-import-ai.js";
import { normalizeCtaGradient } from "../src/shared/brandGradient.js";
export { normalizeCtaGradient } from "../src/shared/brandGradient.js";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import http from "node:http";
import https from "node:https";

const MAX_HTML = 8 * 1024 * 1024;
const MAX_CSS = 2 * 1024 * 1024;
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
// Keep text analysis bounded without rejecting a whole site for page-builder
// payloads. Binary assets and manifests must remain complete.
export function readWebsiteBody(response, { limit, allowPartial = false }) {
  return new Promise((resolve, reject) => {
    if (!allowPartial && Number(response.headers["content-length"]) > limit) {
      response.destroy();
      reject(new Error("This website asset exceeds the import size limit."));
      return;
    }
    let size = 0;
    const chunks = [];
    let settled = false;
    response.on("data", (chunk) => {
      if (settled) return;
      const remaining = limit - size;
      if (chunk.length > remaining) {
        settled = true;
        if (allowPartial) {
          chunks.push(chunk.subarray(0, remaining));
          resolve({ body: Buffer.concat(chunks), truncated: true });
        } else {
          reject(
            new Error("This website asset exceeds the import size limit."),
          );
        }
        response.destroy();
        return;
      }
      chunks.push(chunk);
      size += chunk.length;
    });
    response.on("end", () => {
      settled = true;
      resolve({ body: Buffer.concat(chunks), truncated: false });
    });
    response.on("error", reject);
    response.on("close", () => {
      if (!settled)
        reject(
          new Error(
            "The website connection closed before its response finished. Try again.",
          ),
        );
    });
  });
}
export async function safeFetch(
  value,
  { limit = MAX_HTML, allowPartial = false, signal, redirects = 0 } = {},
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
          // Some public sites reject a bare product-name user agent even
          // though the same public page works for ordinary browser requests.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,text/css,image/*;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
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
          const message =
            res.statusCode === 403 || res.statusCode === 401
              ? "This website blocks automated access. Try its public homepage, or add the hospital name, colours and logos below. Your current details are unchanged."
              : res.statusCode === 429
                ? "This website is temporarily limiting requests. Please try again in a few minutes, or enter your brand details below."
                : `The website could not be loaded (HTTP ${res.statusCode}). Check the URL or try again later.`;
          reject(new Error(message));
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
        readWebsiteBody(res, { limit, allowPartial }).then(
          (result) =>
            resolve({
              ...result,
              type: String(res.headers["content-type"] || "").toLowerCase(),
              url: url.href,
            }),
          reject,
        );
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
      allowPartial,
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
  const named = {
    black: "#000000",
    white: "#ffffff",
    blue: "#0000ff",
    red: "#ff0000",
    green: "#008000",
    navy: "#000080",
    purple: "#800080",
    teal: "#008080",
    orange: "#ffa500",
  };
  const plain = String(value || "")
    .trim()
    .replace(/\s*!important$/, "")
    .toLowerCase();
  if (named[plain]) return named[plain];
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
// Resolve public CSS tokens before comparing actual CTA backgrounds. Keep a
// bounded depth so cycles and missing variables cannot become guessed colours.
function resolvedCss(css) {
  // Dark-theme overrides belong to another surface, not the light-page brand.
  css = css.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selector) =>
    /data-(?:bs-)?theme\s*=\s*["']?dark|\.dark(?:[\s:[.#]|$)|prefers-color-scheme\s*:\s*dark/i.test(
      selector,
    )
      ? ""
      : rule,
  );
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
// Include actual link text and destinations: many sites do not name CTA
// classes "button" (Framer, Webflow and utility CSS are common examples).
function websiteActions(html) {
  const clean = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const { document } = parseHTML(clean);
  const actions = [];
  const entry = (node, label, actionWeight) => ({
    ...Object.fromEntries([...node.attributes].map((a) => [a.name, a.value])),
    tag: node.localName,
    label,
    actionWeight,
    matchesSelector(selector) {
      try {
        return node.matches(selector);
      } catch {
        return false;
      }
    },
  });
  for (const node of document.querySelectorAll('a, button, [role="button"]')) {
    if (actions.length >= 300) break;
    if (node.closest('[hidden], [aria-hidden="true"]')) continue;
    const label = decode(node.textContent).replace(/\s+/g, " ").trim();
    if (label.length > 160) continue;
    const marker = `${label} ${node.getAttribute("aria-label") || ""} ${node.getAttribute("href") || ""}`;
    const strong =
      /book|appointment|sign[ -]?up|register|get started|start (?:now|free)|free trial|request.*demo|contact (?:us|sales)|talk to|schedule/i.test(
        marker,
      );
    const classMarker = `${node.className || ""} ${node.id || ""}`;
    if (
      /accordion|nav-toggler|navbar-toggler|carousel-control|language-selector/i.test(
        classMarker,
      ) ||
      ["tab", "switch"].includes(node.getAttribute("role"))
    )
      continue;
    if (
      /cookie|dismiss|reject|accept all|consent|unsubscribe/i.test(
        marker + classMarker,
      )
    )
      continue;
    if (
      node.localName !== "button" &&
      !strong &&
      !/button|btn|cta/i.test(classMarker) &&
      node.getAttribute("role") !== "button"
    )
      continue;
    actions.push(
      entry(
        node,
        label,
        strong ? 130 : /primary|cta/i.test(classMarker) ? 90 : 45,
      ),
    );
    const textIndex = actions.length - 1;
    // Many sites paint the button wrapper and leave its link transparent.
    // Limit this to a single-action wrapper, never a whole header or hero.
    let parent = node.parentElement;
    for (
      let depth = 0;
      parent && depth < 2;
      depth++, parent = parent.parentElement
    ) {
      if (
        /button|btn|cta/i.test(
          `${parent.className || ""} ${parent.id || ""}`,
        ) &&
        parent.querySelectorAll('a, button, [role="button"]').length === 1
      ) {
        actions.push({ ...entry(parent, label, strong ? 130 : 60), textIndex });
        break;
      }
    }
    for (const child of [...node.querySelectorAll(".btn, .button, .cta")].slice(
      0,
      2,
    ))
      actions.push(entry(child, label, strong ? 130 : 60));
  }
  return actions;
}
function matchedStyles(html, css, tagName) {
  const isCta = tagName === "button";
  const elements = isCta
    ? websiteActions(html)
    : Array.from(parseHTML(html).document.querySelectorAll(tagName)).map(
        (node) => ({
          ...Object.fromEntries(
            Array.from(node.attributes).map((a) => [a.name, a.value]),
          ),
          tag: tagName,
          matchesSelector: (selector) => {
            try {
              return node.matches(selector);
            } catch {
              return false;
            }
          },
        }),
      );
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
      const target = selector
        .replace(/\[[^\]]*\]/g, "")
        .split(/[\s>+~]+/)
        .at(-1);
      if (!target) continue;
      const names = [...target.matchAll(/\.([\w-]+)/g)].map((x) => x[1]);
      const id = target.match(/#([\w-]+)/)?.[1];
      const tag = target.match(/^[a-z][\w-]*/i)?.[0];
      const matches = elements
        .map((a, i) => ({ ...a, index: i }))
        .filter(
          (a) =>
            (!tag || tag === a.tag) &&
            (!names[0] || (a.class || "").split(/\s+/).includes(names[0])) &&
            a.matchesSelector(selector),
        );
      if (!matches.length) continue;
      const score =
        (/(?:primary|book|trial|signup)/i.test(selector) ? 100 : 0) +
        (id ? 50 : 0) +
        names.length * 10 +
        index / 100000;
      rows.push({ selector, body: m[2], score, source: tagName, matches });
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
      matches: [{ ...a, index }],
    });
  }
  if (isCta)
    for (const [index, a] of elements.entries()) {
      const utilities = [
        ...(a.class || "").matchAll(
          /(?:^|\s)(bg|text|border)-\[(#[\da-f]{3,8})\]/gi,
        ),
      ];
      if (utilities.length)
        rows.push({
          selector: `${a.tag} utility colours`,
          body: utilities
            .map(
              (m) =>
                `${m[1] === "bg" ? "background-color" : m[1] === "text" ? "color" : "border-color"}:${m[2]}`,
            )
            .join(";"),
          score: 500,
          source: tagName,
          matches: [{ ...a, index }],
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
  const { document } = parseHTML(html);
  const site = new URL(base).hostname.replace(/^www\./, "");
  const result = [];
  for (const node of document.querySelectorAll('img, svg, [style*="url("]')) {
    const link = node.closest("a[href]");
    const href = link?.getAttribute("href");
    if (href) {
      try {
        if (new URL(href, base).hostname.replace(/^www\./, "") !== site)
          continue;
      } catch {
        continue;
      }
    }
    const region = node.closest(
      'header, nav, footer, [role="banner"], [role="contentinfo"], [class*="footer"], [id*="footer"]',
    );
    const place = region
      ? /footer|contentinfo/i.test(
          `${region.tagName} ${region.getAttribute("role")} ${region.className} ${region.id}`,
        )
        ? "footer"
        : region.tagName.toLowerCase() === "nav"
          ? "nav"
          : "header"
      : "page";
    const parent = node.parentElement;
    const marker = [
      node.getAttribute("alt"),
      node.getAttribute("class"),
      node.id,
      node.getAttribute("aria-label"),
      node.getAttribute("src"),
      node.getAttribute("data-src"),
      parent?.getAttribute("class"),
      link?.getAttribute("aria-label"),
    ]
      .filter(Boolean)
      .join(" ");
    const branded = /logo|wordmark|brand/i.test(marker);
    const homeLink = href && new URL(href, base).pathname === "/";
    if (!branded && !(homeLink && place !== "page")) continue;
    if (
      /partner|certification|award|badge|social|sponsor|developed|powered.by/i.test(
        marker,
      )
    )
      continue;
    const score =
      (branded ? 60 : 0) +
      (place === "header"
        ? 45
        : place === "nav"
          ? 40
          : place === "footer"
            ? 25
            : 0) +
      (homeLink ? 25 : 0);
    if (node.tagName.toLowerCase() === "svg") {
      const svg = safeSvg(Buffer.from(node.outerHTML));
      if (!svg) continue;
      const dimensions = imageDimensions(null, svg);
      const ratio = dimensions.width / dimensions.height;
      if (!(ratio >= 0.65 && ratio <= 12)) continue;
      result.push({
        svg: svg.toString(),
        ...dimensions,
        place,
        score: score + 5,
      });
    } else {
      const srcset =
        node.getAttribute("data-srcset") ||
        node.getAttribute("srcset") ||
        node.parentElement
          ?.querySelector("source[srcset]")
          ?.getAttribute("srcset");
      const background = node
        .getAttribute("style")
        ?.match(/url\(["']?([^"')]+)["']?\)/i)?.[1];
      const sources = [
        node.getAttribute("data-src"),
        node.getAttribute("data-lazy-src"),
        node.getAttribute("src"),
        srcset?.split(",").at(-1)?.trim().split(/\s+/)[0],
        background,
      ];
      for (const source of sources.filter(Boolean)) {
        const url = absolute(source, base);
        if (!url) continue;
        result.push({
          url,
          width: parseFloat(node.getAttribute("width")),
          height: parseFloat(node.getAttribute("height")),
          place,
          score,
        });
      }
    }
  }
  return result
    .sort((a, b) => b.score - a.score)
    .filter(
      (v, i, all) =>
        all.findIndex((x) => (x.url || x.svg) === (v.url || v.svg)) === i,
    )
    .slice(0, 8);
}

export function brandDiscoveryPages(html, base) {
  const { document } = parseHTML(html);
  const origin = new URL(base).origin;
  return [
    ...new Set(
      [...document.querySelectorAll("a[href]")]
        .filter((link) =>
          /about|contact|our.company|our.hospital/i.test(
            `${link.textContent} ${link.getAttribute("href")}`,
          ),
        )
        .map((link) => {
          try {
            const url = validateWebsiteUrl(
              new URL(link.getAttribute("href"), base).href,
            );
            return url.origin === origin &&
              url.href !== base &&
              !/\.(pdf|zip|png|jpe?g)$/i.test(url.pathname)
              ? url.href
              : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    ),
  ].slice(0, 2);
}

// Prefer the site's own theme over early framework/plugin files, then restore
// document order so later overrides retain their place in the CSS cascade.
function websiteStylesheets(links, base) {
  const origin = new URL(base).origin;
  return [
    ...new Map(
      links
        .filter(
          (a) =>
            a.rel?.toLowerCase().split(/\s+/).includes("stylesheet") &&
            a.media?.toLowerCase() !== "print",
        )
        .map((a, index) => {
          const url = absolute(a.href, base);
          if (!url) return [null, null];
          const score =
            (new URL(url).origin === origin ? 40 : 0) +
            (/theme|custom|brand|style|main|app/i.test(url) ? 30 : 0) -
            (/bootstrap|slick|font-awesome|fancybox|plugins|fonts\.google/i.test(
              url,
            )
              ? 50
              : 0);
          return [url, { url, index, score }];
        })
        .filter(([url]) => url),
    ).values(),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .sort((a, b) => a.index - b.index)
    .map((a) => a.url);
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
  const primaryEvidence = new Map();
  const vote = (value, score, evidence, identity) => {
    const hex = hexColor(value);
    if (!hex) return;
    const entry = primaryEvidence.get(hex) || {
      value: hex,
      score: 0,
      evidence,
      identities: new Set(),
    };
    if (entry.identities.has(identity)) return;
    entry.identities.add(identity);
    if (score > entry.score) entry.evidence = evidence;
    entry.score =
      Math.max(entry.score, score) +
      (entry.identities.size > 1 &&
      identity.startsWith("action-") &&
      colour(hex)
        ? 8
        : 0);
    primaryEvidence.set(hex, entry);
  };
  // Resolve the strongest matching declaration per action before comparing
  // colours across actions. Repeated CTAs reinforce each other.
  const painted = new Set();
  const buttonEvidence = [];
  for (const row of ctaRules) {
    for (const action of row.matches || []) {
      if (
        painted.has(action.index) ||
        /secondary|disabled|cookie|dismiss/.test(action.class || "")
      )
        continue;
      const background = declaration(
        [row],
        "background(?:-color|-image)?",
      )?.value;
      const solid = hexColor(background);
      const gradient = /^linear-gradient\(/i.test(background || "")
        ? background.match(/#[\da-f]{6}\b|#[\da-f]{3}\b|rgba?\([^)]*\)/i)?.[0]
        : null;
      const value = solid || colour(gradient);
      // White surfaces aren't a useful primary. Black CTAs are valid when
      // backed by an explicit action, instead of treating all neutrals as branding.
      if (
        !value ||
        (!colour(value) &&
          (action.actionWeight < 100 || parseInt(value.slice(1, 3), 16) > 100))
      )
        continue;
      painted.add(action.index);
      const matching = ctaRules.filter((rule) =>
        rule.matches?.some(
          (match) => match.index === (action.textIndex ?? action.index),
        ),
      );
      const foreground = hexColor(declaration(matching, "color")?.value);
      buttonEvidence.push({
        value,
        foreground,
        gradient: normalizeCtaGradient(background),
        score: action.actionWeight + (solid ? 40 : 30),
        evidence: `${action.label || "Website action"}: ${row.selector.slice(0, 90)}`,
      });
      vote(
        value,
        colour(value) ? action.actionWeight + (solid ? 40 : 30) : 10,
        `${action.label || "Website action"}: ${solid ? "button background" : "CTA gradient base"} (${row.selector.slice(0, 90)})`,
        `action-${action.index}`,
      );
    }
  }
  for (const row of ctaRules)
    for (const action of row.matches || []) {
      if (painted.has(action.index) || action.actionWeight < 100) continue;
      const border = row.body.match(
        /(?:^|;)\s*border(?:-color)?\s*:[^;]*?(#[\da-f]{3,6})\b/i,
      )?.[1];
      const text = declaration([row], "color")?.value;
      const value = colour(border) || colour(text);
      if (value && !/^(?:a|button)$/.test(row.selector))
        vote(
          value,
          action.actionWeight - 10,
          `${action.label}: ${border ? "outline" : "link"} colour (${row.selector.slice(0, 90)})`,
          `action-${action.index}`,
        );
    }
  for (const match of css.matchAll(
    /--([\w-]*(?:primary|brand)[\w-]*)\s*:\s*([^;{}]+)/gi,
  )) {
    if (
      /foreground|text|heading|title|contrast|light|muted|secondary|hover|disabled/i.test(
        match[1],
      )
    )
      continue;
    const value = colour(match[2]);
    if (value)
      vote(
        value,
        /^(?:brand|color-brand|brand-color|primary|primary-color|color-primary)$/.test(
          match[1],
        )
          ? 75
          : 45,
        `Brand CSS token --${match[1]}`,
        `token-${match[1]}`,
      );
  }
  // Client-rendered homepages may omit their main CTAs from the initial HTML.
  // Repeated custom button styles are useful fallback evidence; framework
  // palettes and interaction states are not. Visible matched CTAs rank higher.
  const fallbackButtons = new Map();
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector of match[1].split(",").map((part) => part.trim())) {
      if (
        !/(?:button|btn|cta|submit)/i.test(selector) ||
        /hover|focus|active|disabled|danger|success|warning|info|secondary|cookie|consent/i.test(
          selector,
        ) ||
        /^(?:\.btn(?:-[\w-]+)?|button|input(?:\[[^\]]+\])?)$/.test(selector)
      )
        continue;
      const value = colour(
        declaration([{ body: match[2], selector }], "background(?:-color)?")
          ?.value,
      );
      if (!value) continue;
      const selectors = fallbackButtons.get(value) || new Set();
      selectors.add(selector);
      fallbackButtons.set(value, selectors);
    }
  }
  for (const [value, selectors] of fallbackButtons) {
    if (selectors.size < 2) continue;
    vote(
      value,
      Math.min(70, 30 + selectors.size * 5),
      `Repeated custom CTA styles (${[...selectors].slice(0, 2).join(", ")})`,
      `fallback-${value}`,
    );
  }
  const theme = colour(meta.find((m) => m.name === "theme-color")?.content);
  if (theme) vote(theme, 55, "Website theme colour", "theme");
  const winner = [...primaryEvidence.values()].sort(
    (a, b) => b.score - a.score,
  )[0];
  add("primary", "Primary colour", winner?.value, winner?.evidence);
  const chosenButton = buttonEvidence.sort((a, b) => b.score - a.score)[0];
  add(
    "ctaColor",
    "CTA background colour",
    chosenButton?.value,
    chosenButton?.evidence,
  );
  add(
    "ctaTextColor",
    "CTA text colour",
    chosenButton?.foreground,
    chosenButton?.evidence,
  );
  add(
    "ctaGradient",
    "CTA background gradient",
    chosenButton?.gradient,
    chosenButton?.evidence,
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
    stylesheets: websiteStylesheets(links, base),
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
  const page = await safeFetch(value, { signal, allowPartial: true });
  if (!page.type.includes("text/html"))
    throw new Error("This URL is not a web page. Enter the hospital homepage.");
  const html = page.body.toString("utf8");
  let css = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  const initial = extractBrand(html, css, page.url);
  const styles = await Promise.allSettled(
    initial.stylesheets.map((url) =>
      safeFetch(url, { limit: MAX_CSS, signal, allowPartial: true }),
    ),
  );
  for (const result of styles)
    if (result.status === "fulfilled" && result.value.type.includes("text/css"))
      css += "\n" + result.value.body.toString("utf8");
  const extracted = extractBrand(html, css, page.url);
  const warnings = [];
  if (
    page.truncated ||
    styles.some(
      (result) => result.status === "fulfilled" && result.value.truncated,
    )
  )
    warnings.push(
      "This is a large website, so part of its page or styles was analyzed. Review the detected branding before applying it.",
    );
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
        const safeVector = safeSvg(asset.body);
        const svg = safeVector
          ? Buffer.from(svgForWhiteBackground(safeVector.toString()))
          : null;
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
      async function collect(candidates) {
        for (const candidate of candidates) {
          try {
            const asset = candidate.svg
              ? { body: Buffer.from(candidate.svg) }
              : await safeFetch(candidate.url, { limit: MAX_ASSET, signal });
            const safeVector = safeSvg(asset.body);
            const svg = safeVector
              ? Buffer.from(svgForWhiteBackground(safeVector.toString()))
              : null;
            const mime =
              rasterType(asset.body) || (svg ? "image/svg+xml" : null);
            if (!mime || (svg && whiteOnlySvg(svg))) continue;
            const dimensions = imageDimensions(asset.body, svg, candidate);
            const ratio = dimensions.width / dimensions.height;
            if (Number.isFinite(ratio) && (ratio < 0.65 || ratio > 12))
              continue;
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
      }
      await collect(extracted.logoCandidates);
      if (!found.length && !signal.aborted) {
        const additional = await Promise.allSettled(
          brandDiscoveryPages(html, page.url).map((url) =>
            safeFetch(url, { signal, allowPartial: true }),
          ),
        );
        for (const result of additional) {
          if (
            result.status !== "fulfilled" ||
            !result.value.type.includes("text/html")
          )
            continue;
          const linked = result.value;
          await collect(
            findLogoCandidates(linked.body.toString("utf8"), linked.url),
          );
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
    ctaGradient: "CTA background gradient",
    ctaColor: "CTA background colour",
    ctaTextColor: "CTA text colour",
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
