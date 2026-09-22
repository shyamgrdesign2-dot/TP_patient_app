# Verification · 22 September 2026

- JavaScript/JSX lint: passed.
- Domain tests: **21 passed**. Covers appointment/profile ownership, booking conflicts, cancellations, rescheduling, payments, records, identity consent and expiry, all 16 care-event combinations, freshness/ranking, first-time/returning states, geofence validation, token idempotency, appointment-specific symptom notes and collector-link origin validation.
- Browser suite: **33 passed**, Chrome. Includes all 24 routes; booking/rescheduling/cancellation; family isolation; file upload persistence; PDF rendering, zoom, sharing, download and print; ABHA linking; local authentication and deletion; five welcome stories; new-user setup and returning-account isolation; floating actions and sticky patient/header controls; carousel looping; location rejection/check-in; symptom collection before booking and for an existing appointment; and the complete symptoms → reviewed summary → check-in → queue loop. Home, family, welcome and login accessibility checks passed without serious or critical violations.
- Carousel: manually scripted at 320×720, 393×852 and 1932×1354. Horizontal overflow is enabled; vertical overflow is hidden; vertical wheel interaction leaves track scrollTop at zero. The carousel stays inside the phone viewport.
- Welcome visuals: all five slides captured and inspected, including three generated fictional family portraits, Tesseract Get started CTA, no Pause control and no separate Sign in action. Home scenes remain faded on the right, with grid patterns on the left.
- Optional collector iframe: tested against an intercepted fixture on a separate locally configured build. Confirmed the hospital appointment ID is sent to the same-origin session endpoint, the allowed frame loads, microphone permissions are scoped to its origin, referrers are suppressed and return-to-visit works. **This is not a live collector/session test.** The deployed URL, signed-link BFF, upstream frame policy, login, live AI/voice and hospital summary submission remain unconfigured.
- Production web build: passed. Vite reports a main-chunk size advisory (~789 KB before gzip); PDF generation/viewer and onboarding WebGL are separate lazy chunks.
- Dependency audit: zero known runtime vulnerabilities in the resolved lockfile.
- Production PWA: standalone manifest, static asset caching, offline navigation to an unseen records deep link and offline PDF rendering verified. API responses and patient uploads are not added to the service-worker cache.
- Capacitor: final web assets synchronized successfully into Android and iOS projects.
- iOS: previous scaffold verification — Xcode Debug build for iOS Simulator passed with signing disabled. No new native build or physical-device validation in this refinement.
- Android: synchronized; native build remains unverified because this machine has no available Java runtime.

Screenshots in `docs/screenshots/` show the actual running app.

The preview uses local demo accounts, code 123456 and local queue allocation. No SMS, hospital appointments, clinical submissions, payments or live ABDM operations were performed. Real authentication, patient/EMR services, signed collector sessions, push, native secure storage, release signing and store submission require the integrations in `integration-contract.md`.
