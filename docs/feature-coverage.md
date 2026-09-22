# Feature coverage

| Area                 | Available now                                                                                          | Live service still needed                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Branding             | Central brand config, three presets, custom logo/name/colours/font                                     | Tenant-controlled configuration and hospital release assets                       |
| Introduction / login | Welcome journey, mobile OTP demo, PIN/password demo                                                    | Patient registration, verified OTP, account recovery, secure sessions, biometrics |
| Home                 | Sticky patient/location header, conditional event banners, first-visit state, four actions, ABHA links | Real-time hospital data                                                           |
| Doctors              | Search, specialty/location filtering, profiles                                                         | Verified doctor catalog, availability and fees                                    |
| Booking              | Date/slot/member/channel/reason, confirmation, calendar export                                         | Atomic reservation, patient/EMR linkage, pricing and cancellation policy          |
| Symptom preparation  | Manual booking, add/select family at booking, guided symptoms after confirmation                       | Reuse actual agent runtime after patient-facing contract is confirmed             |
| Appointments         | Upcoming/past/cancelled, hospital source, reschedule/cancel                                            | Hospital-initiated changes and event synchronization                              |
| Queue                | Location-gated demo check-in, idempotent token, wait estimate and Home queue card                      | Live queue stream and hospital check-in policy                                    |
| Family               | Add/edit/switch, relationship, permission acknowledgment                                               | Verified adult delegation, guardianship, revoke/access audit                      |
| Records              | Separate profiles, filter/search/view, upload/download                                                 | EMR release workflow, signed files, malware scan, authorization                   |
| IPD                  | Sample stay and discharge records on the mother profile                                                | Admission service and patient-visible care updates                                |
| Billing              | Invoice detail, outstanding balance, demo payment and receipt                                          | Gateway sandbox/live, webhook verification, refunds, insurance                    |
| UHID / ABHA          | Patient-led sample verification, consent, scoped link/unlink                                           | Actual ABDM identity, consent, discovery and linking                              |
| Vaccinations         | Per-profile sample history, consultation request                                                       | Clinician-managed schedule and eligibility                                        |
| Packages             | Catalog/details, date/collection request                                                               | Service catalog, scheduling, preparation, pricing                                 |
| Home care            | Service/date/address request and history                                                               | Coverage, staff scheduling and callbacks                                          |
| Hospital             | Location picker, geolocation, map directions                                                           | Verified addresses/contact numbers and ambulance desk                             |
| Emergency            | Contacts, official 112 telephone link                                                                  | Verified hospital contact and dispatcher integration                              |
| Notifications        | Inbox/read state, scoped updates, category preferences                                                 | FCM/APNs registration, delivery and events                                        |
| Feedback             | Rating/comments saved locally                                                                          | Hospital support/feedback service                                                 |
| Native delivery      | Shared codebase, Capacitor projects/config                                                             | Native builds, permissions, device testing, signing, app-store release            |

## Additional features worth taking into the live roadmap

Medication reminders derived from signed prescriptions; follow-up reminders; care plans; teleconsultation waiting rooms; insurance/preauthorization and refund tracking; consent history; data export/deletion requests; multilingual and larger-text modes; accessibility review with patients; calendar/deep-link handling; offline connectivity indicators without caching sensitive records; patient support escalation.

Medication/vaccine recommendations should not be generated from unreviewed rules. Reminder content and timing must come from the hospital’s clinical systems or explicit patient input.
