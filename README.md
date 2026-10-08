# Tatva Practice · Patient app

A working **mobile-first patient experience preview**, built with the real Tatva Care Tesseract library and the Medavida app’s interaction patterns. It uses sample patient data, not a live hospital connection.

## Run

The Tesseract design system (`@dhspl-tatvacare/tesseract-ui`) installs from GitHub Packages. Use a GitHub token with `read:packages` and access to the DHSPL-Tatvacare organisation:

```sh
export NODE_AUTH_TOKEN=<your GitHub token with read:packages>
npm ci
npm run dev
```

The project `.npmrc` reads the token from `NODE_AUTH_TOKEN`; never commit a token.

**Deploying (Vercel or any CI):** add an environment variable `NODE_AUTH_TOKEN` with a GitHub token that has `read:packages` and access to the DHSPL-Tatvacare packages, for Production and Preview. `vercel.json` rewrites every route to `index.html`, so `/admin` and other deep links work on refresh.

Open **http://127.0.0.1:5178/**. Desktop shows a phone preview with hospital-brand controls; phones get the full-screen app. `/welcome` opens the introduction and `/login` opens authentication. The home route starts with an explicitly sample patient session for design review. Mobile OTP code: **123456**. No SMS is sent.

## Architecture

One repo, one Vite build, two apps and a shared contract. `src/main.jsx` mounts the admin console for `/admin/*` and the patient app for everything else; each mounts its own providers.

```
src/
  main.jsx    entry and top-level routing
  patient/    patient app (PWA/Capacitor): routes, pages, components, state, services
  admin/      hospital admin console (desktop web)
  shared/     the contract both read: brand/theme/logo, hospital config, catalogue, seed data
```

- [`src/patient`](src/patient/README.md) — what patients use.
- [`src/admin`](src/admin/README.md) — what the hospital configures. It still borrows the patient app's `AppContext` and a few UI components; the README lists them.
- [`src/shared`](src/shared/README.md) — hospital configuration: brand/theme/logo, contacts, features, fees, packages/vaccines catalogue, booking requests.

**Run:** `npm install`, then `npm run dev`. Patient app at http://127.0.0.1:5178/, console at http://127.0.0.1:5178/admin.

**Demo sign-in:** the patient app opens with a sample signed-in patient; `/login` takes any valid 10-digit Indian mobile number with OTP **123456**. The console asks for a role (Hospital admin or Admin doctor) and signs in on "Continue with Tatva Practice"; no credentials.

**Data flow today:** both apps run on one origin in one browser. The console writes configuration to localStorage (`tatva-admin-config`, brand in `tatva-brand-preview`); the patient app reads it on load, and brand changes and patient state sync across tabs through `storage` events. The console reads booking requests from the patient's demo state (`tatva-patient-demo-v1`). Nothing leaves the browser.

**Production (suggested):**

- Patient app (PWA/Capacitor) and Admin console (web) as separate deployables.
- A Hospital Configuration service: the console writes, the patient app reads. It owns what `src/shared` describes today, plus booking requests.
- Tatva Practice APIs for doctors, clinics, slots, appointments, prescriptions, bills and ABHA.
- Endpoints, authentication and tenancy for both services are to be defined; see [integration contract](docs/integration-contract.md).

## What works locally

- Sticky name/location header with hospital emergency and notification controls; a patient-scoped event carousel with semantic colours, a first-visit welcome state, and a foreground home sheet. Four bottom tabs: Home, Calendar, Records and More.
- Doctor search, specialty filters, doctor profiles, slot selection, booking for a family member, appointment history, reschedule/cancel, calendar export, sample hospital-created appointments and queue check-in.
- Guided symptom collection adapted from the existing patient-agent quick replies: symptoms, duration, severity, history, vitals, editable summary and doctor/booking handoff. AI/voice services remain disconnected.
- Per-profile records, filters and PDF/JPG/PNG uploads in IndexedDB. A 92% document sheet renders PDFs with page navigation/zoom, Share, Download and Print; sample records generate clearly labelled demonstration PDFs.
- Family/profile editing, hospital contact configuration, notifications/preferences, feedback and confirmed local account deletion (including uploaded files and saved credentials).
- View-only bills (outstanding and paid), invoice and receipt downloads; payment happens at the hospital, vaccination history, health-package and home-care requests, inpatient discharge history.
- Patient-led UHID and ABHA linking from Home, Records, Profile and More, plus official ABHA creation from Home: sample identity entry, expiring demo OTP, explicit consent, per-family-member connection state, and unlinking. No live verification or record import.
- Five-slide onboarding with generated family portraits and Tesseract controls; mobile-number → Send code → OTP → existing account or first-time profile setup; locally hashed quick PIN/password with attempt limits. These **are not production authentication**.
- Hospital branding presets plus custom name, logo, colours and fonts. Updates persist in this browser.

## Home, arrival and PWA

The [care-card contract](docs/home-card-contract.md) defines event visibility, ranking, colour, first-visit and empty states. After booking, symptom questions and a reviewed visit summary lead into hospital check-in (with an explicit skip option). Hospital check-in requires a same-day in-clinic appointment and a fresh, accurate geolocation within the configured site radius before allocating a **local demo token**. Coordinates are demonstration locations; verify actual hospital entrances before integration. A live backend must allocate tokens, verify arrival and publish wait estimates.

The production build includes a standalone web manifest, app icons and a versioned service worker. Its allowlist caches bundled UI assets only. Browser install availability varies; native OS installation has not been validated. Live patient APIs and uploaded files are excluded from service-worker caching. The development server deliberately does not register a service worker.

## Branding: one source

[`src/shared/brand.js`](src/shared/brand.js) owns app/hospital names, colour seeds, font families, logo and native app ID. `TesseractThemeProvider` generates the colour ramps; explicit font variables cover all app components and portals. No brand colour is embedded in screen CSS.

The admin console's App configuration screen (`/admin/app`) is a **preview-only administrator tool**, not a patient permission model. Production brand settings must be deployed or served from an authenticated tenant configuration service. Brand presets change appearance, not the active tenant or data scope.

```sh
node scripts/configure-tenant.mjs
npm run build
npm run mobile:sync
```

Native projects live in `ios/` and `android/`. Hospital-specific app IDs, names, app icons, signing and store accounts must be configured before release. If you change the bundle ID after native project generation, regenerate the platform for that tenant instead of assuming `cap sync` renames it.

## Data and integration boundaries

`src/patient/state/model.js` holds validated demo mutations. React state persists sample entities under `tatva-patient-demo-v1`; uploaded demo files are stored separately in IndexedDB. This storage must **not** be used for live patient records or production sessions.

`VITE_PATIENT_MODE=demo` is the only implemented runtime mode. Other explicit modes fail closed with a configuration screen. A normal production bundle is still a demo bundle until patient services are implemented. The app does not call the doctor portal or reuse its saved doctor token.

See [integration contract](docs/integration-contract.md), [feature coverage](docs/feature-coverage.md), and [design references](docs/design-references.md) for the exact scope and remaining live-service work.

## Checks

```sh
npm test            # Domain invariants
npm run lint        # JavaScript/JSX correctness
npm run test:e2e    # Chrome: patient journeys and accessibility
npm run build      # Web production bundle
```

The Playwright configuration uses locally installed Chrome. CI can install Chromium and remove the `channel` override. Tests cover family separation, booking/reschedule/cancel, uploaded records, view-only billing, branding, OTP/PIN, family addition, every screen and accessibility.

## Internal dependency

`@dhspl-tatvacare/tesseract-ui` (^1.1.0) is installed from the organisation's GitHub Packages registry (see `.npmrc`). Local installs and CI need `NODE_AUTH_TOKEN` set to a token with `read:packages`; in CI inject it as a secret. Keep this repository private.

The Capacitor CLI’s `xcode` dependency is overridden to use UUID 11’s patched compatible CommonJS API. `npm audit` should remain clean; native sync is tested with the resolved versions.

## Verified build

See [verification results](docs/verification.md) for the checks performed, platform limitations, and the distinction between working demo flows and live services. The iOS Simulator Debug build succeeds; Android needs a local JDK/SDK before build validation.

Booking is manual, with slot selection → existing/new family member → review → confirmation. The full-page symptom collector follows confirmation; no reason field or voice-booking picker is shown. Pending symptoms remain available after check-in, through the Home appointment banner and inline visit/queue actions. The UI uses the Tesseract AI gradient for symptom entry points.
