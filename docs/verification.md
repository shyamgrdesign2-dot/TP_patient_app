# Verification · 22 September 2026

- JavaScript/JSX lint: passed.
- Domain tests: 10 passed (profile ownership, invalid dates/locations, duplicate doctor and patient slots, cancellation, rescheduling, payment idempotency, record attachment).
- Browser tests: 10 passed, Chrome at 390×844 plus narrow-screen checks. Booking to cancellation, family separation and creation, local file upload/download across reload, explicit payment simulation, persistent branding/font changes, invalid/valid OTP and PIN sign-in, all 23 screens, home and family-dialog accessibility.
- Web production build: passed.
- Dependency audit: 0 known vulnerabilities in the resolved lockfile.
- Capacitor: Android and iOS platform generation and sync passed.
- iOS: Xcode Debug build for iOS Simulator passed with code signing disabled. This is a compile check, not a physical-device or App Store validation.
- Android: project generated and synchronized. Build not run because this machine has no available Java runtime.

Screenshots are in `docs/screenshots/`. These show the actual running app, not design mockups.

Not tested or implemented: live patient service, EMR synchronization, SMS delivery, gateway charges, ABDM verification, live queue events, APNs/FCM, native secure storage/biometrics, native download/share handoff, video rooms, hospital dispatch, release signing or store submission. See `integration-contract.md` for the required services.
