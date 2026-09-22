import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";

// Only cache bundled UI assets. Patient responses, uploads and API requests
// never enter the service worker cache.
export function patientPwa() {
  return {
    name: "patient-pwa",
    writeBundle(options) {
      const root = resolve(options.dir || "dist");
      const assets = ["/index.html", "/manifest.webmanifest"];
      function walk(dir) {
        for (const item of readdirSync(dir, { withFileTypes: true })) {
          const path = resolve(dir, item.name);
          if (item.isDirectory()) walk(path);
          else assets.push("/" + relative(root, path));
        }
      }
      for (const dir of ["assets", "icons", "brand", "images"])
        walk(resolve(root, dir));
      const version = createHash("sha256")
        .update(
          assets
            .map((path) => readFileSync(resolve(root, "." + path)))
            .reduce((a, b) => Buffer.concat([a, b]), Buffer.alloc(0)),
        )
        .digest("hex")
        .slice(0, 12);
      writeFileSync(
        resolve(root, "sw.js"),
        `
const CACHE = "tatva-shell-${version}";
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("tatva-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/index.html", { ignoreVary: true })));
  } else if (ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.match(event.request, { ignoreVary: true }).then(cached => cached || fetch(event.request)));
  }
});
`,
      );
    },
  };
}
