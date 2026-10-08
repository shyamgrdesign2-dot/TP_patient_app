# shared/ — the contract between the two apps

Both `src/patient` and `src/admin` import from here. Nothing here imports from
either app. Treat it as the hospital-configuration contract: when the apps
become separate deployables, this folder becomes the schema and client for a
Hospital Configuration service.

| File | Owns |
| --- | --- |
| `brand.js` | Brand and theme: app/hospital names, colours, fonts, logo/mark, presets, clinic locations, native app ID. Also read by `scripts/configure-tenant.mjs`. |
| `hospitalConfig.js` | What the console sets for the patient app: feature switches, support contacts, booking rules, per-doctor fees and visibility, clinic extras, campaigns, packages and vaccines. localStorage key `tatva-admin-config`. |
| `catalog.js` | The packages/vaccines catalogue the patient app lists: the console's saved catalogue, or the starter one. |
| `data.js` | Seed and reference data both apps read: doctors (with console fee overrides), slots, packages, the initial demo patient state, and date/money helpers. |
| `videoVisit.js` | Video-visit timing helpers used by `data.js` (and the patient app). |
| `BrandTheme.jsx`, `ErrorBoundary.jsx`, `DemoOnly.jsx` | The root wrappers each app mounts: brand → Tesseract theme, crash fallback, demo-mode gate. |
| `ui/` | Tesseract wrappers with no app state or app CSS: `Icon`, `Badge`, `Status`. |
| `global.css` | Base reset and tokens loaded once by `src/main.jsx` for both apps. |

## Today vs production

Today the console writes the configuration to same-origin localStorage, and
the patient app reads it on load (brand changes also arrive live through the
`storage` event). This only works because both apps are served from one
origin in one browser.

In production the console writes this configuration through a Hospital
Configuration service/API, and the patient app reads it from that service.
Booking requests (package bookings, callbacks) flow the other way and belong
to the same service or to Tatva Practice. Endpoints are to be defined; keep
the shapes in `hospitalConfig.js` and `brand.js` as the starting schema.
