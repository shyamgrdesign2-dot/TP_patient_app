# Verification · 22 September 2026

- JavaScript/JSX lint: passed.
- Domain tests: 11 passed (profile ownership, invalid dates/locations, duplicate doctor and patient slots, cancellation, rescheduling, payment idempotency, record attachment, identity/profile matching, consent and OTP expiry).
- Browser tests: 16 passed, Chrome at 390×844 plus narrow-screen checks. Booking to cancellation, family separation and creation, local file upload/download across reload, explicit payment simulation, persistent branding/font changes, invalid/valid OTP and PIN sign-in, all 24 listed routes, home and family-dialog accessibility. Added tests for header location/notification sheets, drag dismissal and focus restoration, centered navigation at 320/390px, patient-led UHID and ABHA link/unlink persistence and profile isolation, direct ABHA entry with reduced-motion/accessibility checks, sticky-header geometry after scrolling, carousel content/navigation, ABHA entry from Home, matching quick-action colours and the no-upcoming-appointment state at 320px.
- Web production build: passed.
- Dependency audit: 0 known vulnerabilities in the resolved lockfile.
- Capacitor: refreshed web assets synchronized successfully into both Android and iOS projects after this UI refinement.
- iOS: previous scaffold verification — Xcode Debug build for iOS Simulator passed with code signing disabled. This is a compile check, not a physical-device or App Store validation.
- Android: project generated and synchronized. Build not run because this machine has no available Java runtime.

Screenshots are in `docs/screenshots/`. These show the actual running app, not design mockups.

Not tested or implemented: live patient service, EMR synchronization, SMS delivery, gateway charges, ABDM verification, live queue events, APNs/FCM, native secure storage/biometrics, native download/share handoff, video rooms, hospital dispatch, release signing or store submission. See `integration-contract.md` for the required services.
