# admin/ — the hospital admin console

The desktop web console mounted by `src/main.jsx` for `/admin/*`
(`AdminRoot.jsx` → `AdminApp.jsx`). Routes: `/admin/overview`, `/admin/app`
(app configuration and theme), `/admin/doctors`, `/admin/packages`,
`/admin/notifications`.

Demo sign-in: pick "Hospital admin" or "Admin doctor" and continue; the
session is kept in sessionStorage (`tatva-admin-session`). No credentials.

It writes the hospital configuration defined in `src/shared` (brand/theme/
logo, contacts, features, fees, clinic extras, packages/vaccines catalogue)
and reads booking requests made in the patient app. Today that is
same-origin localStorage; in production the console writes through a
Hospital Configuration service/API that the patient app reads. See
`../shared/README.md`.

## Cross-dependencies on the patient app (to remove before splitting)

- `patient/state/AppContext.jsx` — `AppProvider`/`useApp` give the console
  the saved brand and `saveBrand` (App configuration), and the demo patient
  state plus `dispatch` (Overview: visits, package requests, callbacks).
- `PackagesConfig.jsx` reads and updates package bookings directly in the
  patient's localStorage key `tatva-patient-demo-v1`.
- `patient/components/ui.jsx` — `Button` (carries the patient button style)
  and `BrandLogo`/`BrandMark` (read the brand from `useApp`).

When the console becomes its own deployable, replace these with a brand
store in `shared/` (or the config service client), booking requests from the
service, and console-owned `Button`/brand components.
