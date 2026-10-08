# patient/ — the patient app

Everything only the patient app uses: the mobile-first PWA/Capacitor app
mounted by `src/main.jsx` for every path outside `/admin`.

- `App.jsx` — patient routes (`/welcome`, `/login`, `/`, `/doctors`, `/records`, …) inside `AppProvider` and the brand theme.
- `pages/`, `components/` — screens and patient UI (`components/ui.jsx` holds the patient UI kit; it re-exports `Icon`, `Badge`, `Status` from `shared/ui`).
- `state/` — `AppContext.jsx` (demo patient state in localStorage `tatva-patient-demo-v1`, brand in `tatva-brand-preview`, cross-tab sync through `storage` events) and `model.js` (validated state mutations).
- `services/` — patient-only logic: ABHA, symptom collector session, care updates, notices, demo auth, IndexedDB files, record PDFs.
- `config/collector.js` — hosted symptom-collector URL and mode.
- `App.module.css`, `Auth.module.css`, `Home.module.css` — patient styles.

It reads hospital configuration (brand, contacts, features, fees, catalogue)
from `src/shared`. Today that is same-origin localStorage written by the
console; in production it is read from the Hospital Configuration
service/API, and doctors, clinics, slots, appointments, prescriptions, bills
and ABHA come from Tatva Practice APIs (to be defined). See `../shared/README.md`.

Used by the admin console (cross-dependency, see `../admin/README.md`):
`state/AppContext.jsx` and `components/ui.jsx` (`Button`, `BrandLogo`,
`BrandMark`).
