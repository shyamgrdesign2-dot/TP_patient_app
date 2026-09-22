# Tatva Practice · Patient app

A working **mobile-first patient experience preview**, built with the real Tatva Care Tesseract library and the Medavida app’s interaction patterns. It uses sample patient data, not a live hospital connection.

## Run

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5178/**. Desktop shows a phone preview with hospital-brand controls; phones get the full-screen app. `/welcome` opens the introduction and `/login` opens authentication. The home route starts with an explicitly sample patient session for design review. Mobile OTP code: **123456**. No SMS is sent.

## What works locally

- Sticky name/location header with hospital emergency and notification controls; a patient-scoped event carousel with semantic colours, a first-visit welcome state, and a foreground home sheet. Four bottom tabs: Home, Calendar, Records and More.
- Doctor search, specialty filters, doctor profiles, slot selection, booking for a family member, appointment history, reschedule/cancel, calendar export, sample hospital-created appointments and queue check-in.
- Guided symptom collection adapted from the existing patient-agent quick replies: symptoms, duration, severity, history, vitals, editable summary and doctor/booking handoff. AI/voice services remain disconnected.
- Per-profile records, filters and PDF/JPG/PNG uploads in IndexedDB. A 92% document sheet renders PDFs with page navigation/zoom, Share, Download and Print; sample records generate clearly labelled demonstration PDFs.
- Family/profile editing, hospital contact configuration, notifications/preferences, feedback and confirmed local account deletion (including uploaded files and saved credentials).
- Bill review, explicitly simulated payments, sample receipts, vaccination history, health-package and home-care requests, inpatient discharge history.
- Patient-led UHID and ABHA linking from Home, Records, Profile and More, plus official ABHA creation from Home: sample identity entry, expiring demo OTP, explicit consent, per-family-member connection state, and unlinking. No live verification or record import.
- Five-slide onboarding with generated family portraits and Tesseract controls; mobile-number → Send code → OTP → existing account or first-time profile setup; locally hashed quick PIN/password with attempt limits. These **are not production authentication**.
- Hospital branding presets plus custom name, logo, colours and fonts. Updates persist in this browser.

## Home, arrival and PWA

The [care-card contract](docs/home-card-contract.md) defines event visibility, ranking, colour, first-visit and empty states. After booking, symptom questions and a reviewed visit summary lead into hospital check-in (with an explicit skip option). Hospital check-in requires a same-day in-clinic appointment and a fresh, accurate geolocation within the configured site radius before allocating a **local demo token**. Coordinates are demonstration locations; verify actual hospital entrances before integration. A live backend must allocate tokens, verify arrival and publish wait estimates.

The production build includes a standalone web manifest, app icons and a versioned service worker. Its allowlist caches bundled UI assets only. Browser install availability varies; native OS installation has not been validated. Live patient APIs and uploaded files are excluded from service-worker caching. The development server deliberately does not register a service worker.

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

Booking is manual, with slot selection → existing/new family member → review → confirmation. The full-page symptom collector follows confirmation; no reason field or voice-booking picker is shown. Pending symptoms remain available after check-in, through the Home appointment banner and inline visit/queue actions. The UI uses the Tesseract AI gradient for symptom entry points.
