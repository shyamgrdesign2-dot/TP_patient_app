# Patient-service integration contract

Status: proposed architecture and contract, **not verified existing endpoints**. The current application implements local demo flows only. This is the remaining work needed for a real end-to-end hospital deployment.

## Existing source inspected

`DHSPL-Tatvacare/Pm-Doctor-Portal` provides Tesseract UI 1.1.0, mobile layouts, appointment agent configuration, the doctor authentication service, patient/appointment modules and hospital branding patterns. The Medavida source supplies the requested interaction reference.

The portal’s `src/pages/auth/authService.js` contains `/api/v1/auth/password-login`, `/api/v1/auth/check-user`, and `/api/v1/auth/verify-access-token`. Its OTP UI uses an external OTP provider. These observations establish a reusable authentication pattern, **not patient authorization**. Some doctor flows explicitly use doctor IDs. Do not use a doctor token in a patient app, ship administrative API keys, or call doctor endpoints without validating their patient audience and authorization.

## Proposed deployment

Patient web / iOS / Android → patient BFF (backend for frontend) → existing authentication, appointment, EMR, billing, queue and notification services.

- Resolve the hospital tenant from its verified deployment or signed configuration. A user-controlled tenant ID must not grant access.
- A login account owns verified contact methods; it is not itself an EMR patient. Family members are distinct patient identities with per-hospital MRNs.
- The BFF maps a verified account to a patient and explicit family-access grants. Every list, detail, download and mutation checks tenant, patient and delegated consent.
- Do not merge medical records on phone number alone; a family can share one phone. Use the hospital’s patient matching and duplicate-resolution policy.
- Authenticate web sessions with a server-issued secure session mechanism. Store native credentials through platform-secure storage; biometric/PIN unlock protects an existing session, and does not replace server authorization.
- Sensitive records are not cached in localStorage or an offline service worker. File downloads need signed, short-lived URLs and an access audit.

## Proposed capability endpoints

These are contract names to agree with backend owners, not claims about deployed URLs.

| Patient BFF route                           | Responsibility                                                   |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `POST /patient/auth/otp/request`            | Challenge ID, rate limiting, resend policy, provider request     |
| `POST /patient/auth/otp/verify`             | Challenge expiry/attempt enforcement, patient-audience session   |
| `POST /patient/auth/password`               | Password authentication through existing auth infrastructure     |
| `GET /patient/session`                      | Account, authorized profiles, consent scopes, resolved tenant    |
| `POST /patient/registration`                | Idempotent account-to-patient onboarding with EMR linkage        |
| `GET/POST /patient/family`                  | Family profiles; new adult access starts pending verification    |
| `POST /patient/family/{id}/consent`         | Verify adult delegation or guardianship, version consent         |
| `DELETE /patient/family/{id}/consent`       | Revoke access and invalidate cached permissions                  |
| `GET /patient/doctors`                      | Location, specialty, language and available services             |
| `GET /patient/doctors/{id}/slots`           | Hospital timezone, channel, clinician availability, slot version |
| `POST /patient/appointments`                | Atomic slot reservation + EMR appointment, idempotency key       |
| `PATCH /patient/appointments/{id}`          | Versioned reschedule/cancel with policy evaluation               |
| `GET /patient/profiles/{id}/appointments`   | Include patient-, family-, hospital- and agent-created visits    |
| `GET /patient/appointments/{id}/queue`      | Token, current status, last-update timestamp, wait estimate      |
| `POST /patient/appointments/{id}/check-in`  | Hospital-controlled time window and check-in rules               |
| `GET /patient/profiles/{id}/records`        | Only finalized records released for patient access               |
| `POST /patient/records/upload-intent`       | Presigned upload, MIME validation, scan and size limits          |
| `GET /patient/records/{id}/download`        | Authorized, expiring URL; consent and audit event                |
| `GET /patient/profiles/{id}/admissions`     | Patient-visible inpatient events and discharge artifacts         |
| `GET /patient/profiles/{id}/invoices`       | Invoice items, payments, credits, refunds and balance            |
| `POST /patient/invoices/{id}/payment-order` | Gateway order with immutable amount/currency/invoice             |
| `GET /patient/payment-orders/{id}`          | Server-verified status; frontend success is insufficient         |
| `POST /patient/abha/link`                   | ABDM transaction through authorized integration                  |
| `GET/POST /patient/consents`                | Health-record discovery/linkage/share and revocation             |
| `GET /patient/profiles/{id}/vaccinations`   | Clinician-recorded doses and clinically managed schedule         |
| `GET /patient/packages`                     | Tenant-approved packages, rates, inclusions and preparation      |
| `POST /patient/service-requests`            | Packages, home collection, home care and vaccine consultation    |
| `POST/DELETE /patient/devices`              | Device token registration, logout cleanup, tenant association    |
| `GET /patient/notifications`                | Authorized inbox, unread state and safe internal deep links      |
| `PUT /patient/preferences`                  | Per-category notification preferences                            |
| `POST /patient/feedback`                    | Patient feedback, visit association and support routing          |

## Synchronization with EMR

Patient registration must produce one durable EMR linkage before reporting completion. Booking uses an atomic reservation or hold followed by commit. Use idempotency keys for registration, bookings and payment orders. Return conflicts explicitly so the client can refresh available slots.

Recommended events: `patient.registered`, `patient.updated`, `family.access.changed`, `appointment.created`, `appointment.rescheduled`, `appointment.cancelled`, `queue.updated`, `record.released`, `admission.updated`, `invoice.updated`, `payment.verified`, `vaccine.recorded`.

Events carry immutable event IDs, resolved tenant ID, patient ID, entity ID/version, timestamp and correlation ID. Use a durable outbox, consumer deduplication, retries, dead-letter recovery and reconciliation. The patient app receives only records released to patients; draft notes and internal hospital operations are excluded. Show the last sync time and retry state when stale.

## Payments, ABHA and push

- Payments: amount comes from the invoice service. The gateway webhook is signature-verified and processed idempotently. A client callback never marks an invoice paid. Handle pending, failure, refund and reconciliation states. UPI is a payment method, unrelated to ABHA.
- ABHA: implement the actual ABDM-supported verification, consent, discovery, linking and revocation. Do not treat a entered 14-digit number or local OTP as proof of identity.
- Push: register APNs/FCM tokens after consent; remove on logout/revocation, avoid health details in lock-screen content, and check profile authorization when opening a deep link. Preferences in this demo do not register devices or send notifications.
- Video visits: selected channel is recorded in the demo. A real visit requires authenticated video-room creation, lobby/access timing and platform microphone/camera permissions.
- Ambulance: publish verified hospital numbers or connect its dispatcher. The demo offers the official India emergency number and does not claim to dispatch an ambulance.

## Inputs still required

1. Patient API owner, staging base URL, actual schemas and patient-scoped test credentials.
2. Hospital tenant IDs, patient matching rules, family consent model, clinical release policy.
3. Appointment/agent and queue APIs; payment provider sandbox and webhooks.
4. ABDM integration credentials and approved flows; FCM/APNs setup.
5. Real hospital contacts, locations, doctors, service catalog and logo assets.
6. Native app IDs, signing and store accounts.

Store publication, live health-data handling and production readiness cannot be validated from a local sample app. The present deliverable is the functional design foundation plus native project scaffolding.

## Patient-led UHID / ABHA connection

`/link-records` is the entry point; `/abha` opens the ABHA sheet directly. Demo state is `healthLinks[memberId]`, with separate `uhid` and `abha` entries. Hospital UHID links include `hospitalId`. No record is imported, relabelled or exposed by the demo link operation. Unlinking removes the connection, not the patient’s records.

The live adapter must replace the entire sample verification path with server-issued transactions. The server must resolve the supplied UHID within the authenticated hospital, deliver verification to the already registered channel, bind the transaction to patient + hospital + session, enforce rate/attempt/expiry limits, verify family delegation, and return only the minimum matching identity information. An entered UHID or a local profile name is not proof of ownership. Unknown identifiers must not disclose whether a patient exists.

ABHA identity verification must use the approved ABDM integration. Identity linking is distinct from record discovery, care-context linking and consent to share records. Display the real requested data, recipient, purpose, duration and revocation controls before sharing. The current checkbox demonstrates the interaction only; it does not create valid ABDM consent. Link status and revocation must be confirmed by the server and audited.

## Home overview

See [home-card-contract.md](home-card-contract.md) for the implemented conditional event adapter and the backend data requirements. Cards appear only for relevant authorized events and are ranked by urgency, with a single first-visit welcome state for profiles without history.

## Local account deletion and live account lifecycle

Settings exposes Delete account with explicit confirmation. In demo mode it clears the account state, local quick-access credential and IndexedDB uploads, signs out, and persists a deletion marker so reload cannot recreate a signed-in account. Signing into the demo again starts a fresh sample account. Hospital medical records are not deleted by this local operation.

A live deletion flow requires authenticated re-verification, a server request/status contract, session and device-token revocation, family-delegation handling, and a clear distinction between deleting portal access and hospital records subject to the hospital’s retention policy. Do not label a queued server request complete until the service confirms the result.

## Emergency, files and installation

Header emergency and ambulance call links remain disabled until valid tenant phone numbers are configured. Sample hospital coordinates are not verified entrances. The shared location configuration must carry actual site latitude/longitude and check-in radius before use.

Document viewers are local PDF.js canvases with an accessible text summary, page navigation and zoom. Sample PDFs are generated with pdf-lib and marked non-clinical. Real document downloads, file sharing and print requests must honor access/consent controls and audit requirements. Printing currently rasterizes pages, so native vector printing and mobile platform handoff require integration testing.

The PWA service worker caches only the emitted static asset allowlist. It does not cache API responses or uploaded files. The native Capacitor builds and browser PWA are the same demo codebase. Tenant deployment must update manifest identity, icons, scope and theme in addition to UI settings; the runtime branding screen does not change an installed app’s OS identity.

## Appointment symptom collector integration

Inspected `DHSPL-Tatvacare/pm-agents-pwa`, branch `prod`, commit `0770b5f`. The default `master` is a scaffold; the production branch contains the actual collector, chat/voice, language selection and summary submission. The upstream booking flow obtains `symptomsCollectorLink` via `get-symptoms-collector-link` and navigates to it. Its entry route is `/symptoms-collector?jwtToken=…`; it verifies appointment status and has its own patient login. No parent-window completion message contract was found.

Patient app entry points are on booking confirmation and confirmed visit details. The local flow saves the reviewed symptom note against that appointment, checks active-profile ownership and resumes it on reload. Before check-in, the app asks the patient to complete symptom collection (or explicitly skip it). Saving the summary returns to location-verified check-in and then the generated queue. An intake already completed before booking is reused. Live visit refreshes must supply `symptomCollectorStatus: "completed"` once the upstream summary has actually been submitted; simply returning from the iframe does not mark completion. It does not submit clinical data to a hospital.

Optional iframe adapter:

- `VITE_SYMPTOM_COLLECTOR_SESSION_ENDPOINT`: same-origin `/api/…` endpoint supplied by the patient BFF.
- `VITE_SYMPTOM_COLLECTOR_ORIGIN`: exact HTTPS origin of the deployed collector.
- Appointments need an authorized hospital `externalId`. Sample IDs cannot launch the live service.
- The app POSTs `{ appointmentId }` with same-origin session credentials and no-store caching. The BFF authorizes the patient and appointment, maps the repository’s required hospital/patient/doctor IDs, and calls the existing link service server-side. It returns `{ link }`. This is the proposed patient-side adapter contract, not an endpoint already provided by the repository.
- API secrets remain server-side. The returned link must match the configured origin and `/symptoms-collector`. It stays in component memory, with no-referrer iframe policy and no local storage or parent URL persistence.
- The frame permits the collector’s scripts, login forms, microphone (only on user permission), downloads and separate windows. “Open separately” supports deployments whose frame policy blocks embedding. “Return to visit” does not claim that a summary was submitted.
- The actual deployed CSP/frame-ancestors policy, SSO/session exchange, voice permission behavior and server-side submission must be verified with the hospital deployment. No live deployment URL or signed-link BFF is configured in this preview.
