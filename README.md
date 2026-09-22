# Tatva Practice · Patient app

A working **mobile-first patient experience preview**, built with the real Tatva Care Tesseract library and the Medavida app’s interaction patterns. It uses sample patient data, not a live hospital connection.

## Run

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5178/**. Desktop shows a phone preview with hospital-brand controls; phones get the full-screen app. `/welcome` opens the introduction and `/login` opens authentication. The home route starts with an explicitly sample patient session for design review. Mobile OTP code: **123456**. No SMS is sent.

## What works locally

- Sticky location-first header, a patient-specific appointment/report/bill carousel, a rounded sheet with matching blue quick actions, nearest-location lookup, glass bottom navigation, and animated/drag-dismissible family, location and notification sheets.
- Doctor search, specialty filters, doctor profiles, slot selection, booking for a family member, appointment history, reschedule/cancel, calendar export, sample hospital-created appointments and queue check-in.
- Guided booking assistant collecting a visit reason and duration. This is a scripted booking flow, not a medical AI or clinical triage system.
- Per-profile records, category/search filters, sample document previews/downloads, and PDF/JPG/PNG uploads stored in browser IndexedDB.
- Family and profile editing, emergency contacts, notification inbox, notification preferences, feedback.
- Bill review, explicitly simulated payments, sample receipts, vaccination history, health-package and home-care requests, inpatient discharge history.
- Patient-led UHID and ABHA linking from Home, Records, Profile and More, plus official ABHA creation from Home: sample identity entry, expiring demo OTP, explicit consent, per-family-member connection state, and unlinking. No live verification or record import.
- Demo OTP entry, validation and resend timer; locally hashed quick PIN/password with attempt limits. These **are not production authentication**.
- Hospital branding presets plus custom name, logo, colours and fonts. Updates persist in this browser.

## Branding: one source

[`src/config/brand.js`](src/config/brand.js) owns app/hospital names, colour seeds, font families, logo and native app ID. `TesseractThemeProvider` generates the colour ramps; explicit font variables cover all app components and portals. No brand colour is embedded in screen CSS.

The `/branding` screen is a **preview-only administrator tool**, not a patient permission model. Production brand settings must be deployed or served from an authenticated tenant configuration service. Brand presets change appearance, not the active tenant or data scope.

```sh
node scripts/configure-tenant.mjs
npm run build
npm run mobile:sync
```

Native projects live in `ios/` and `android/`. Hospital-specific app IDs, names, app icons, signing and store accounts must be configured before release. If you change the bundle ID after native project generation, regenerate the platform for that tenant instead of assuming `cap sync` renames it.

## Data and integration boundaries

`src/state/model.js` holds validated demo mutations. React state persists sample entities under `tatva-patient-demo-v1`; uploaded demo files are stored separately in IndexedDB. This storage must **not** be used for live patient records or production sessions.

`VITE_PATIENT_MODE=demo` is the only implemented runtime mode. Other explicit modes fail closed with a configuration screen. A normal production bundle is still a demo bundle until patient services are implemented. The app does not call the doctor portal or reuse its saved doctor token.

See [integration contract](docs/integration-contract.md), [feature coverage](docs/feature-coverage.md), and [design references](docs/design-references.md) for the exact scope and remaining live-service work.

## Checks

```sh
npm test            # Domain invariants
npm run lint        # JavaScript/JSX correctness
npm run test:e2e    # Chrome: patient journeys and accessibility
npm run build      # Web production bundle
```

The Playwright configuration uses locally installed Chrome. CI can install Chromium and remove the `channel` override. Tests cover family separation, booking/reschedule/cancel, uploaded records, simulated payments, branding, OTP/PIN, family addition, every screen and accessibility.

## Internal dependency

`vendor/dhspl-tatvacare-tesseract-ui-1.1.0.tgz` is the exact private package already installed in the supplied doctor portal. It is pinned locally so this project installs without copying an npm token. Keep this repository private within DHSPL-Tatvacare. For normal organisation CI, replace the file dependency with the authenticated GitHub Packages version using a secret-injected read token.

The Capacitor CLI’s `xcode` dependency is overridden to use UUID 11’s patched compatible CommonJS API. `npm audit` should remain clean; native sync is tested with the resolved versions.

## Verified build

See [verification results](docs/verification.md) for the checks performed, platform limitations, and the distinction between working demo flows and live services. The iOS Simulator Debug build succeeds; Android needs a local JDK/SDK before build validation.
