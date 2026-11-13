# Tatva Practice patient app — frontend and backend handoff

Updated: 14 October 2026. Audience: frontend, backend, mobile/release engineers, QA and coding agents.

This is the primary implementation handoff. It describes the current repository and the required production boundary. It supersedes earlier scope summaries in the README, integration contract and feature coverage. The detailed [home-card contract](home-card-contract.md) remains authoritative for carousel content and selection rules.

## 1. Product and the two deliverables

The product lets a hospital offer its patients a branded app for appointments, health records, family care and ABHA. Hospital staff continue working in Tatva Practice; patients see the permitted results in the patient app.

| Deliverable | Users and deployment | Responsibilities |
| --- | --- | --- |
| **Patient App Administration inside Tatva Practice** | Hospital admins/admin doctors, inside the existing authenticated Tatva Practice web portal | Configure branding, contacts, enabled services, appointment policies, app-facing doctor fees and clinic presentation. Preview the patient experience. In production reuse Tatva Practice identity, roles and hospital context. |
| **Patient mobile app** | Patients and authorized family caregivers; Android distribution through Google Play, with iOS/App Store as a separate release target | Patient authentication, booking, viewing released records and bills, uploading personal medical documents, ABHA and other patient features. Consume Tatva Practice's patient-authorized APIs. |

These are **two separate deployment and authorization surfaces**, even though this prototype builds both from one repository. The admin console is not a patient-app screen and must not ship as an accessible admin workspace in the store app. The phone frame, desktop marketing panel, Customize link and admin preview controls are review tools, not native patient UI.

Do not create a second clinical backend or an independent hospital database. **Use Tatva Practice APIs as the only application backend.** If an existing API lacks patient permissions or a needed capability, extend the Tatva Practice platform or add a Tatva-owned patient facade in its infrastructure. That facade must reuse Tatva services and their records; it is not a replacement system of record.

## 2. What is implemented versus production-ready

- This is a functioning **local demonstration**, with sample patient data and browser-persisted mutations. `VITE_PATIENT_MODE=demo` is the only implemented mode; setting another nonempty value renders a blocking configuration screen. An optimized production build is still a demo.
- Patient OTP, quick-access credentials, booking, record publishing, ABHA operations, notifications and account deletion are simulated locally unless an explicitly configured external collector is used. No production patient session or general Tatva clinical API integration is implemented.
- Website analysis is a real server-side network operation. Optional website evidence classification can call an external AI provider. Configured hosted symptom collection also leaves the local app. Do not describe the entire app as offline or claim nothing leaves the browser.
- Capacitor Android/iOS projects and PWA support exist. Store submission, production authentication, authorized API integration, signing, device verification and operational release are still required.
- Several admin components exist without active routes. A component's presence is not evidence that a feature is enabled. Current admin navigation enables **App configuration**, **Doctors & clinics** and **Patient feedback** only; Overview, Packages & vaccines and Messages are disabled.

## 3. Repository and development entry points

React 19, React Router 7, Vite 7, CSS Modules, Tesseract UI 1.1.0, Capacitor 8, PDF.js and pdf-lib. The private Tesseract package is vendored; installation requires no registry token.

```sh
npm ci
npm run dev                 # http://127.0.0.1:5178
npm test                    # Domain and service tests
npm run lint
npm run test:e2e             # Playwright, local Chrome configuration
npm run build
npm run mobile:sync          # Builds and syncs Capacitor platforms
npm run mobile:android
npm run mobile:ios
```

| Area | Source / responsibility |
| --- | --- |
| Entry and application split | [`src/main.jsx`](../src/main.jsx): `/admin/*` versus patient routes, independent providers |
| Patient routes and guards | [`src/patient/App.jsx`](../src/patient/App.jsx), [`DemoOnly.jsx`](../src/shared/DemoOnly.jsx) |
| Patient layout | `src/patient/components/Shell.jsx`, `PatientHeader.jsx`, `src/patient/App.module.css` |
| State and validated demo mutations | [`AppContext.jsx`](../src/patient/state/AppContext.jsx), [`model.js`](../src/patient/state/model.js) |
| Admin shell and configuration | `src/admin/AdminApp.jsx`, `AppConfig.jsx`, `DoctorsConfig.jsx` |
| Admin patient feedback | `src/admin/Feedback.jsx` (analytics page), `Overview.jsx` (compact card, unrouted), `src/patient/pages/Account.jsx` (submission), seed in `src/shared/data.js` |
| Shared configuration | `src/shared/brand.js`, `hospitalConfig.js`, `catalog.js`, `BrandTheme.jsx` |
| Website analyzer | `src/admin/BrandWebsiteImport.jsx`, `scripts/brand-import-service.js`, `scripts/brand-import-ai.js`, `api/brand-import.js` |
| Logo editor | `src/admin/LogoCropper.jsx`, `src/shared/logoContrast.js` |
| Theme and CTA rules | `src/admin/CtaGradientEditor.jsx`, `src/shared/brandCta.js`, `brandContrast.js`, `brandGradient.js` |
| Record storage/rendering | `src/patient/services/files.js`, `records.js`, `recordPdf.js`; `components/DocumentViewer.jsx`, `PdfViewer.jsx`, `MedicalRecordTile.jsx` |
| Fixtures | `src/shared/data.js`, `recordExamples.js`, `labAnalysis.js`; these are not API responses |
| Tests | `tests/*.test.js` and `tests/e2e/*.spec.js` |

The sample account starts signed in for review. `/login` demonstrates mobile OTP using **123456**, with no SMS sent. Never carry this bypass or code into a production release.

## 4. Frontend: complete route and feature inventory

### 4.1 Navigation, context and presentation

- Bottom navigation: Home, Visits, Records and More. Some detail and full-screen flows hide or replace the surrounding navigation.
- Selected family member scopes appointments, records, ABHA and relevant billing views. Changing location scopes doctor/clinic choices. Keep account identity separate from the selected patient.
- Desktop presents the patient app in a phone frame; mobile uses the available viewport. Safe areas, sheets, keyboard behavior and sticky actions need real-device testing.
- Shared Tesseract controls, icon wrappers, theme tokens, error boundaries, accessible sheets, status messages and focus behavior should be preserved. Do not replace them with unrelated component libraries.
- Hospital branding affects in-app appearance. A theme change must never change tenant identity or patient access rights.

### 4.2 Route map

| Route | Screen / functionality |
| --- | --- |
| `/welcome` | Five-slide onboarding/introduction |
| `/login` | Mobile number, OTP, returning-user quick access and first-time profile setup |
| `/` | Home dashboard and patient-specific care carousel |
| `/doctors` | Doctor search/filter, doctor details and booking entry |
| `/book` | AI-assisted or manual booking chooser; `?mode=assistant` opens the guided assistant |
| `/book/:doctorId` | Doctor-specific manual booking flow |
| `/appointments` | Upcoming/past visits, visit details and permitted actions |
| `/appointments/confirmed/:id` | Booking confirmation and symptom entry |
| `/records` | Six record sections, upload sheet and document sheets; query parameters preserve section/document selection |
| `/records/:id` | Document/report detail |
| `/records/:id/concerning` | Concerning lab parameters from the report analysis model |
| `/family` | Family list, add/edit and switch member |
| `/profile` | Selected health profile and personal details |
| `/billing` | View-only bills, invoices and receipts |
| `/hospital` | Hospital/clinic information, contacts, location/maps and timings |
| `/more` | Secondary navigation and account actions |
| `/notifications` | Patient updates, read state and destination navigation |
| `/settings` | Preferences, quick access, sign-out, local reset/deletion flows |
| `/emergency` | Configured hospital help and personal emergency contacts |
| `/abha` | ABHA creation/linking demonstration |
| `/link-records` | Direct ABHA management when linked; redirects to `/abha` when unlinked |
| `/feedback` | Feedback/rating and help/contact experience |
| `/assistant` | Symptom collector entry; mode depends on configuration |
| `/packages`, `/packages/:id`, `/packages/bookings` | Optional package/vaccine catalogue, details and booking requests |
| Unknown route | Friendly page-not-found state |

Routes after login are guarded by the demo session today. Production requires verified authentication and authorization in addition to route guards. Hidden navigation alone is not a security boundary.

### 4.3 Authentication, profile and family

- Login accepts a valid Indian mobile number, OTP entry/resend flow and first-time profile setup. Quick access can be a six-digit PIN or password.
- Local quick credentials use a salted PBKDF2 hash; five failures cause a five-minute lock. This is demo behavior, not a substitute for server sessions or native secure storage.
- Family/profile forms validate personal details and relationships. Existing profile/member identifiers must remain stable when edited; switching profiles must not leak the previous person's records or ABHA state.
- Settings include preferences, quick access setup and confirmed local account deletion. Local deletion clears demo account data and uploaded files. Production deletion/export/retention needs the Tatva account lifecycle; do not equate deleting local storage with deleting a real medical record.

### 4.4 Home and care cards

Home includes the greeting/member and location controls, emergency access, notifications, carousel, Book visit / My records / My bills shortcuts, connected-health section, records/consultation summaries, family access and hospital branding. Feature flags control the relevant sections.

The carousel uses stable category slots: **Appointments, Health records, ABHA**, and optional **Preventive care**. `src/patient/services/careUpdates.js` owns the tag, middle heading/subtext, footer and CTA for each state. `CareCarousel.jsx` renders that payload.

| Category | Implemented variants |
| --- | --- |
| Appointments | `welcome`, `available`, `upcoming`, `needs-symptoms`, `completed` |
| Health records | `empty`, `history`, `new`, `available` |
| ABHA | `unlinked`, `linked` |
| Preventive care | `empty`, `available`, `requested`, `confirmed` |

All 15 variants have complete content and actions. See the [content/state matrix](home-card-contract.md) for exact copy, time windows, selection precedence and transitions. Do not put status logic inside JSX or invent extra queue/payment states.

Main headings and subtext remain **one line** across narrow cards. Prefer short copy; dynamic text reduces to the readable minimum then ellipsizes with access to its full value. Footer details may wrap. ABHA uses the label **ABHA** and **Not linked / Linked** tags. Carousel duplicates remain inert to keyboard and assistive technology.

### 4.5 Doctors, manual booking and Mira

- `/book` opens the booking method sheet with **Book with AI assistant** and **Book manually**. Mira's image fills its rounded-square icon area; avoid a white circular image inset.
- Manual flow: doctor discovery/details → available date/time and visit type → selected/existing/new family member as offered by the flow → review → confirmation. Preserve selections when navigating backward.
- Guided booking collects choices through the scripted assistant and can hand off to manual booking with prefilled choices. It is not an autonomous live booking service or connected general LLM.
- Clinic and video consultation modes depend on doctor availability and the hospital feature flag. Fees are displayed from app configuration; missing fees do not make a doctor unbookable. Payment is at the hospital; no patient payment gateway is implemented.
- Appointment actions include detail, reschedule, cancel, calendar export and symptom entry as applicable. Validate member/doctor/location/slot, prevent past bookings and enforce booking window and cancellation cutoff. Production must enforce these again and atomically check slot availability.
- Video join state is modeled in `src/shared/videoVisit.js`: confirmed video visit, opens 15 minutes before and closes 60 minutes after the start. A working production meeting URL/session must come from Tatva's teleconsult service; the timing UI does not establish a live integration.
- Legacy screenshots/docs about queue tokens and geofenced arrival are not the current home-card contract. No queue route is registered. Do not scope a production queue/check-in service based only on those historical files.

### 4.6 Symptoms and external collector modes

`src/patient/config/collector.js` defines `VITE_SYMPTOM_COLLECTOR_URL`:

| Value | Behavior |
| --- | --- |
| Unset or `mock` | Local placeholder mirroring the hosted collector |
| `off` | Local guided demo collector |
| URL | Hosted collector iframe; patient authenticates in that experience |

The local guided flow covers symptoms, duration/severity, history/vitals and reviewed summary. Collection is tied to the intended appointment/member; skip and pending states are retained. Entry points use the Tesseract AI gradient treatment.

A separate session adapter in `src/patient/services/agentSession.js` supports a Tatva-owned same-origin `/api/` endpoint and configured HTTPS collector origin. It requires an appointment `externalId`, posts `{ appointmentId, mode }`, validates the returned link/origin/path and can confirm completion through `statusUrl`. **This is a frontend adapter contract, not an already deployed backend endpoint.** Hosted iframe loading or a client message alone must not mark symptoms complete. Confirm completion from Tatva's appointment-linked service before updating production state. Never embed a doctor token in an iframe or app bundle.

### 4.7 Records and clinical ownership

| Section | Content owner | Empty-state action / patient editing |
| --- | --- | --- |
| Medical records | Patient uploads and permitted hospital/ABHA documents | **Upload Records** when enabled |
| Visits | Past visits, one per row: doctor photo/initials and name, then icon-led lines for date and time, the medicines prescribed (truncated), and clinic · in-clinic or video (building or video icon; the doctor's own clinic when no appointment is linked). Diagnosis and Rx-format chips stay in the viewer. Opening a row shows the prescription in the visit viewer | **Book appointment**; no patient upload |
| Lab results | Released hospital/lab results | **Book appointment**; no patient upload |
| Medical history | Doctor/hospital-maintained clinical history | **Book appointment**; no patient upload |
| Discharge summary | Hospital-issued discharge documents | **Book appointment**; no patient upload |
| Certificates | Doctor/hospital-issued patient certificates | **Book appointment**; no patient upload |

The last five sections populate when the doctor or hospital publishes relevant information through Tatva Practice. Patients must not create or edit those clinical entries through the upload flow. Family demographics are a separate capability from clinical history.

- Record filters, counts, search and tab-specific displays operate on the selected member. Medical-record categories include Pathology, Radiology, Prescription and Other.
- **Visit viewer** (`src/patient/components/VisitRecords.jsx`, modelled on the Past Visits view of the Tatva Practice app): a full-height sheet with a date stepper (older · `DD MMM YYYY | hh:mm AM` with a jump-to list · newer), a doctor strip with a `02/04` position counter, the prescription document, and share / download / print. Prescriptions carry `rxFormat` (`"digital"` typed in the portal, or `"written"` handwritten and scanned, i.e. Tatva's Smart Rx / Tab Rx / Snap Rx) and `digitised`. Written + digitised shows a **Written Rx / Digital Rx** segmented toggle (written first, as issued); written-only shows a notice that no digital copy exists; digital shows the PDF. The demo draws the written scan on a canvas from the same structured `rx` data (`src/patient/services/writtenRx.js`); production serves the hospital's scan (image or PDF) and the digitised PDF from the document store.
- Empty states center the icon, title, copy and action within their content area. Medical records use normal descriptive subtext explaining both hospital records and personal uploads. Other sections explain doctor/hospital updates using the orange notice treatment without an info icon. Avoid duplicate empty-state and sticky upload CTAs.
- A populated Medical records section has a sticky upload action. Other sections do not get an upload action. Respect `recordUploads` in all entry points.
- Document tiles have compact thumbnails, category/source/analysis indications and a slight top/bottom fade for legible overlays.
- Document action sheets show **View Document, Download Document, Share Document** with left-aligned icons/text and dividers.
- Viewer supports PDF/image display, PDF page/zoom controls and applicable share/download/print actions. Visit documents can open in a sheet without losing the Records context. Unavailable files and unsupported sharing must use the existing error/fallback paths.
- Original Report and AI analysis are separate views. Analysis/parameter summaries in this repository are demo data, not a validated diagnostic engine. Production analysis must come from Tatva's authorized service and include pending/unavailable/error states.
- ABHA document source attribution retains provider and record date in a compact strip with the ABHA mark, leaving more room for the document.

### 4.8 Upload medical records: exact interaction contract

1. Open the upload sheet for the selected member. With **zero files**, show a vertically/horizontally centered transparent picker with a strong primary-colored dotted border and underlined **Upload record** label. **No sticky footer CTA** in this state.
2. Accept up to **5 files**, selected together or incrementally: **PDF, JPG/JPEG, PNG, GIF**, nonempty and at most **10 MB per file**. Validate before accepting; retain already selected valid drafts when another file fails.
3. After at least one file is selected, **remove the dotted picker**, show the selected count and per-file accordion cards. Sticky bottom actions become **Upload more** (left, secondary, upload icon) and **Save record / Save N records** (right, primary, tick icon). Disable adding at the limit or while saving.
4. Each accordion header has a **44 px square thumbnail**, original file name, date and far-right standard accordion chevron. No delete icon in the header. PDF/image previews stay compact; no large full-width preview inside the form.
5. Expanded fields: required record title, required investigation date, required record type, optional notes. Date/type inputs align and dropdown chevron has inset padding. Reject invalid/future investigation dates. Use visible field errors.
6. Notes limit is **300 characters**, enforced by `maxLength` with a counter. This matches Tatva Practice desktop `src/pages/medicalRecords/UploadDocument.js` and mobile `src/pages/mobile/PatientDetails/components/MobileUploadMedicalRecord.js`, both inspected on 14 October 2026.
7. **Remove file** is centered at the bottom of each expanded card, below a divider. Removing the final file returns to the initial picker without a footer.
8. Validate all drafts before publishing. Current demo stores files in IndexedDB before publishing records and preserves stable IDs for retry. Storage/save failure must retain inputs and show a retryable error; never claim success when only part of the operation completed.
9. Production must implement the equivalent through Tatva document APIs, with upload progress/cancellation, server validation, idempotency and explicit partial-failure recovery. Browser IndexedDB is not the production medical-record store.

### 4.9 ABHA

- `/abha` demonstrates creation using Aadhaar verification and linking using mobile, ABHA address or ABHA number, with OTP/method selection, address selection/creation and success states. Biometric capture UI is demonstrative, not a connected certified device flow.
- Linking belongs to the selected family member. ABHA identity, consent, sync preferences and records must never cross members.
- Unlinked `/link-records` goes directly to the ABHA flow. Linked `/link-records` shows management directly: identity card, sync options/status, View records and confirmed unlink. Do not restore an extra intermediate chooser screen.
- Demo sync supports selected facilities/record types and auto-sync preference; record merging is idempotent by ID. Demo records are generated fixtures, not fetched ABDM health information.
- Production must use Tatva's ABHA integration and consent lifecycle. Link verification is not blanket permission to retrieve every record; consent expiry/revocation and authorized family access remain service responsibilities.
- Some legacy labels/helpers still mention UHID. There is no independently verified production UHID-linking API in this app. Treat this as terminology/integration cleanup, not proof of a working second identity flow.

### 4.10 Remaining patient functionality

| Feature | Current behavior and integration boundary |
| --- | --- |
| Bills & receipts | Outstanding/paid views, invoice/receipt presentation and downloads. View only; hospital records payments. No pay-now/refund UI service integration. |
| Hospital and contacts | Clinic information, address, maps, timings, emergency/ambulance/front desk/WhatsApp/billing/support contacts. Do not fabricate a contact when configuration is empty. |
| Family | Add/edit/select member, profile details and relationship. Real guardian/delegation rights must be enforced by Tatva. |
| Notifications | Local appointment, record, request and reminder events, read state and deep links. OS push registration/delivery is not implemented. |
| Settings | Notification/preferences and local quick access, reset and account deletion. Server persistence and lifecycle remain integration work. |
| Emergency | Hospital contacts and personal contacts, including add-contact form; phone actions use device capabilities. |
| Feedback | Rating and optional text, maximum 1,000 characters, tagged with the active member (id, name, date of birth, gender, MRN snapshot); current persistence is local. The admin console's Patient feedback page (`src/admin/Feedback.jsx`) reads the same list, read-only, with period/rating/sentiment/comment filters, trend charts and CSV export, showing the patient's name, age, gender and patient ID. The demo seeds sample feedback (`demo: true`) for the demo profiles only. See `docs/PATIENT_FEEDBACK_ADMIN.md`. |
| Packages & vaccines | Off by default. When enabled, listed catalogue, clinic filtering/details/photos, prices, preparation/eligibility, request form and booking status/cancellation. Request notes allow 500 characters. Requests are not confirmed appointments until hospital confirmation; pay at hospital. |
| Callback/request helpers | Demo state has callback and service request actions. Wire only active UI to verified Tatva workflows; do not interpret these reducers as existing backend APIs. |

## 5. Frontend: administration inside Tatva Practice

### 5.1 Active modules and edit behavior

`/admin` redirects to `/admin/app`; `/admin/doctors` and `/admin/feedback` are also active.

**Responsive shell.** The console adapts in three steps, driven by `matchMedia` in `AdminApp.jsx` and matching media queries in `Admin.module.css`: above 1100 px the full 264 px Tesseract `Sidebar`; 901–1100 px (iPad landscape) the 80 px collapsed rail; at or below 900 px (iPad portrait, phones) a white top bar with the brand, **Open patient app** and the sections as horizontally scrollable Tesseract `Tabs`. The main pane keeps scrolling in every mode (sticky headers rely on it) and exposes its padding as `--main-pad-x` / `--main-pad-y` (32 px; 16/20 px at or below 900 px) for full-bleed elements. Wide tables sit in a `.tableScroll` wrapper that scrolls sideways rather than overflowing. The App configuration preview `<dialog>` is opened without moving focus, because `show()` otherwise scrolls the pane to the phone on tablets. Production should mount these modules in Tatva Practice's shell and remove the separate demo identity/navigation scaffolding as appropriate.

App configuration starts with a saved summary. Each **Edit** link is underlined with an edit icon. Edit mode has Hospital, Theme, Fonts, Contacts, Appointments and Features sections. Draft changes preview immediately; **Save changes** commits, **Cancel** restores saved configuration.

The preview is the same iframe as it expands/collapses, preserving its route and working state. **Expand preview** and **Close preview** are centered below the phone in their respective modes. Keep the live-preview caption and accessible toggle focus. Draft preview uses a scoped BroadcastChannel; it must not silently publish unsaved brand changes to unrelated patient sessions.

### 5.2 Hospital, logos and website analysis

- Hospital name/tagline, separate square app icon and horizontal logo. Asset cards show previews plus edit/replace actions; header, splash and app-icon previews illustrate usage.
- Manual logo upload supports safe image/vector formats as shown in the picker, maximum 5 MB. Preserve original assets for re-editing. Unedited SVG stays vector; edited output is PNG.
- Logo editor supports fit, pan/zoom, rotation/background and horizontal crop width/height. The **outer crop frame itself** changes; 4:1 is a starting point, not a forced horizontal ratio. Fit visible artwork so logos with baked-in whitespace do not appear tiny.
- Theme/white-background logo handling is centralized; do not stretch a horizontal wordmark into a square icon or hardcode a fixed wordmark ratio.
- **Analyze website** immediately fills supported fields in the current draft. Users review/edit those actual fields. There is no separate Review detected brand / Add to draft CTA step. Global Save still publishes configuration.
- No-result state uses bright orange styling, useful explanation and **no review CTA**; keep existing fields when nothing usable was detected. Partial results and asset-import warnings must not wipe unrelated fields.
- Analyzer looks across page markup, header/footer logos, inline SVG/images, linked styles, manifest/favicons and limited additional discovery pages when no usable logo is found. CTA evidence is considered for primary color; neutral black/white buttons should not drown out meaningful chromatic brand evidence.
- **Known limitation:** this is bounded static HTML/CSS analysis, not an exhaustive whole-site crawl or browser-rendered CSS evaluation. Additional page discovery is a logo fallback. JavaScript-only sites, inaccessible assets and unusual CSS can yield incomplete or incorrect colors. Preserve evidence/manual review; never claim perfect detection or select a blue default as if it were detected evidence.

### 5.3 Theme, fonts, contacts and policies

- Primary brand color is distinct from CTA color. CTA supports solid or gradient fill and text color. Heading/body text colors are configurable, with readable fallback treatment. Use shared contrast/gradient utilities rather than ad hoc screen CSS.
- Separate heading/body fonts with previews; custom WOFF2/WOFF/TTF/OTF under 1.5 MB, remove/reselect behavior and fallback fonts. Production must store licensed assets in approved Tatva-managed storage.
- Contacts: emergency, ambulance, booking/front desk, WhatsApp, billing/insurance, patient support phone/email, with validation and empty states.
- Appointment policy: booking window choices 7/14/30/60/90 days; cancellation/reschedule cutoff 0/1/2/4/12/24 hours. Defaults: 90 days and 2 hours. These are UI configuration, not server enforcement today.
- Feature flags: `videoConsult`, `symptomCollector`, `abha`, `bills`, `familyProfiles`, `recordUploads`, `packages`. Packages default off; the others default on. Test all entry points and direct routes when disabling a feature.

### 5.4 Doctors & clinics

Tatva Practice owns doctor profiles, clinic relationships, availability and clinic master details. The admin screen groups doctors by clinic and edits app-facing consultation/video fees. Clinic extras include patient-facing photos and a short note. Do not fork or replace the underlying doctor/clinic master data.

The configuration model also has per-doctor visibility and catalogue/campaign fields. `Overview.jsx`, `PackagesConfig.jsx` and `PushNotifications.jsx` are present but not routed by the current admin shell. Their local code must not be handed off as a live admin publishing workflow. If those modules are enabled later, persist through Tatva APIs and add role checks/tests first.

### 5.5 Patient feedback

`/admin/feedback` (`src/admin/Feedback.jsx`) is the hospital's read-only view of everything patients submit from **Account → Feedback** in the app. Full detail, including the data model and production notes, is in [`docs/PATIENT_FEEDBACK_ADMIN.md`](PATIENT_FEEDBACK_ADMIN.md).

- **Header.** Title, subtitle and the filter row form one white band pinned to the top of the console pane (sticky; the negative margins cancel the pane padding and the sticky `top` cancels it again because Chrome measures sticky offsets on the margin box). Keep the band when restyling; it is what keeps the active period and filters visible while the analytics scroll.
- **Filter row, one line, every control 42 px.** Search (comment, patient name, patient ID) on the left; on the right a single Tesseract `DateRangePicker` whose preset rail offers All time · Last 30 days · This month · Last month · This year · Last year plus two calendars for a custom range, a sort `Dropdown` (newest, oldest, highest, lowest), the Tesseract `Filter` panel (Rating 1–5 multi-select, Sentiment single, Comments with/without) with removable chips, a **Reset all** ghost button when anything is active, and a compact **CSV** export of the filtered set.
- **KPIs.** Four `StatCard`s: average rating (gold stars), responses (sparkline), positive share, with a comment. When the period has a previous window (every preset except All time, and any custom range) each tile shows the change against it: This month vs last month, This year vs last year, a custom range vs the same length before it.
- **Charts.** `LineChart` average rating per bucket; stacked `BarChart` of responses by sentiment per bucket; horizontal `BarChart` rating distribution; `DonutChart` sentiment split. Buckets are per day up to two weeks, per week up to four months, otherwise per month; empty buckets are kept.
- **Sentiment rule.** Positive = 4–5 stars, Neutral = 3, Negative = 1–2, derived from the star rating only. The rule is printed in every subtitle that mentions sentiment, on the Positive share tile, in the Filter group label, and in an info tooltip on the sentiment cards. Do not introduce text-based sentiment without changing all of those.
- **Responses table.** Tesseract `DataTable`, 8/16/32 per page. Columns: Rating, Patient (name; age · gender · patient ID beneath), Comment (wraps), Submitted. Submissions made before identity was attached show "Not recorded".
- **Identity.** The app tags each submission with the active member: `memberId` plus a snapshot of `patientName`, `dob`, `gender`, `mrn`, `relation`. No contact details are stored with feedback. The console resolves `memberId` against the live member first and falls back to the snapshot. The app's feedback screen tells the patient the rating is shared with the hospital under their name and patient ID; keep that line (or replace it with a consent checkbox if legal requires one).
- **Demo data.** `src/shared/data.js` seeds 24 `demo: true` entries across the three demo family members over the last eight months (`seedVersion` 10; `AppContext.jsx` migrates existing demo saves once). Newly registered test patients get no seed feedback.
- **Empty states.** No feedback at all: Tesseract `Empty` explaining where feedback comes from. Filters matching nothing: smaller `Empty` with a reset action.

## 6. Backend: Tatva Practice APIs only

### 6.1 Ownership and architecture

```text
Tatva Practice web portal                    Patient Android/iOS app
  existing staff authentication                patient authentication
  Patient App Administration module            authorized family context
                   \                          /
              Tatva Practice API boundary
    tenant config, patient access, appointments, records,
       billing, ABHA, symptoms and communications
                           |
             existing Tatva-owned services/storage
```

A patient facade, if needed, belongs to the Tatva backend and exists for authorization, response shaping and orchestration. Do not introduce Firebase/Supabase or another parallel database/auth/clinical backend to make the demo production-ready. Native push, app stores and ABDM are downstream platform integrations handled through Tatva's approved infrastructure where applicable; they are not alternative application systems of record.

Website import is an **admin utility**. Move/protect its server handler within Tatva infrastructure. Its public-website fetches are separate from clinical APIs. The optional external AI classifier is not a requirement for patient operations; keep it off unless explicitly approved for admin branding use. No clinical documents should go through the website-analysis service.

### 6.2 Verified source references, not assumed patient endpoints

The following routes/functions were inspected in the local **Pm-Doctor-Portal** repository at commit `3e100a260` on 14 October 2026. Paths below are relative to that repository. They prove existing portal call sites, **not** that the endpoints accept patient tokens or are safe to expose unchanged. API owners must verify current server contracts, environments, payloads and patient permissions before integration. No live patient API calls were made for this handoff.

| Capability | Observed Tatva reference | How to use for this app |
| --- | --- | --- |
| Staff authentication | `src/pages/auth/authService.js`: POST `/api/v1/auth/password-login`, `/check-user`, `/verify-access-token` under the same auth prefix | Admin module inherits the portal's session. These are not verified patient login endpoints; never reuse staff credentials in the patient app. |
| Patient demographics | `src/api/services/ApiAppointments.js`: `addPatient`, `editPatient`, `viewPatient`; appointment service routes `addPatient`, `editPatientProfile`, `viewPatient` | Map authorized patient/family profiles; do not expose staff-wide search/list capabilities. Confirm matching and guardian permissions. |
| Slots and appointment creation | `src/pages/addAppointment/service.js`: GET `/api/v1/appointment/listSlots?doctorId=…&date=…`; POST `/api/v1/appointment` | Use authoritative Tatva slots and atomic booking. Teleconsult uses the service's visit-type fields; preserve returned appointment/consultation IDs. |
| Appointment list/cancel/reschedule | `src/api/services/ApiAppointments.js`: POST `/api/v1/appointment/listAppointment`, POST `/api/v1/appointment/cancelAppointment`, PUT `/api/v1/appointment/:pam_id` | Scope to patient/tenant. Reschedule in place; retain appointment ID rather than cancel-and-rebook. |
| Document categories, upload/list/detail | `src/pages/medicalRecords/service.js`: GET `/api/v1/docs/category/all`, POST `/api/v1/docs/upload`, GET `/api/v1/docs/all?patient_unique_id=…`, GET `/api/v1/docs/:id` | Use Tatva document metadata/storage contracts; confirm multipart shape, ownership, upload limits and patient-visible document rules. |
| Other document helpers | Same file: PUT `/api/v1/docs`, DELETE `/api/v1/docs/:id`, POST `/api/v1/docs/upload-temp` | Reference only; do not grant patient edits/deletion of doctor-owned records. Draft removal before save is not server record deletion. |
| Lab results | `src/api/services/ApiLabParams.js`: `fetchAllLabReports`, GET `/results/:doctorId/:patientId` | Return only released results for the authorized patient; do not accept arbitrary doctor/patient IDs as authorization. |
| Medical history | `src/api/services/ApiMedicalHistory.js`: POST `/api/v1/medicalhistory/getPatientLastHistory` | Read patient-visible clinical history. The same file includes private-note APIs; never include staff private notes in patient responses. |
| Certificates | `src/api/services/ApiMedicalCertificate.js`: POST `/api/v1/appointment/listPatientCertificate`, `/viewPatientCertificate` | Read issued patient certificates only, not certificate templates or staff write/delete operations. |
| Bills | `src/pages/opdBilling/service.js`: `fetchBillsByPatient`, `fetchBillDetailsByBillNumber`, `fetchBillDetails`; OPD/IPD variants under `/api/v1/billing/` | Read bills/status and authorized invoice/receipt files. Refund, clear-due and bill editing remain staff operations. |
| ABHA enrollment/linking | `src/api/services/ApiAbha.js`: M1 `/api/v1/abdm/m1/enrollmentByAadhaar/*` and `/api/v1/abdm/m1/abhaVerification/*` | Reuse Tatva's OTP/address/number verification and patient mapping, adapted for patient-authorized access. |
| ABHA consent/records | Same file: M3 `/api/v1/abdm/m3/hiuConsent/listConsent`, `viewDetailsConsent`, `requestInitialConsent`, `fetchHealthRecord`, `viewConsentRecord` | Reuse Tatva consent and record retrieval; enforce approved patient/facility/type/time scope and revocation. |
| Clinic information | `src/pages/appointmentAgent/service.js`: `fetchClinicDetails`, GET `/api/v1/receptionist/clinicDetails?clinicId=…` | A source reference for clinic data; verify the appropriate patient/public projection with owners. Do not expose staff agent setup endpoints. |
| IPD/discharge | `src/api/services/ApiIpd.js` exposes admission checking, not a verified patient discharge-document feed | Confirm the actual released discharge document contract with Tatva IPD/document owners. Do not invent a route from the screenshot. |

Different portal files use different Tatva base URLs (`appointment_api_url`, `visit_api_url`, `lab_params_api_url`, `abha_api_url`, `abha_records_api_url`, billing/IPD settings). Do not concatenate every listed route to one guessed host. Resolve environment routing through Tatva configuration; never copy production secrets into `VITE_*` variables.

### 6.3 Required Tatva contracts still to confirm or implement

These are capability requirements, **not claims that a route already exists**:

| Capability | Contract needed |
| --- | --- |
| Patient authentication | OTP challenge/verify/resend, expiry/rate limits, session refresh/revoke, returning-account detection and recovery |
| Family authorization | Account-to-patient/guardian grants, invitations/revocation if supported, tenant-specific patient ID mapping |
| Hospital app configuration | Versioned read/publish of brand assets, theme, contacts, flags, fees, policies and clinic extras; admin-only writes and patient-safe reads |
| Doctor directory | Patient-visible doctor/clinic listing and availability; fees must agree with server policy |
| Records aggregation | Authorized, paginated/searchable section feeds, release status, origin, category and protected file access; medical history and discharge schemas. For visits: per prescription the issuing doctor, appointment (clinic, in-clinic/video, time), `rxFormat` (digital / written), `digitised`, the scan URL for written Rx and the PDF URL for digital Rx, plus prev/next ordering for the stepper |
| Notifications | Preference storage, read state, device push registration, safe deep links and delivery events |
| Symptoms / Mira | Authorized appointment session creation and completion status; production booking assistant orchestration if desired |
| Lab analysis | Existing Tatva analysis job/results contract or explicit unavailable state |
| ABHA lifecycle | Patient permissions for link/unlink, sync status, consent revocation/expiry and auto-sync subscription behavior |
| Packages/vaccines | Catalogue, price/listing, request, confirm/cancel and clinic scope within Tatva; existing billing bundles must not be assumed to be the patient catalogue |
| Support and feedback | Tenant-scoped feedback: a patient-authorized write from the app carrying the active member, and an admin-only list returning `{ id, rating, message, createdAt, patient: { id, name, mrn, age, gender } }`, filterable by date range and paginated, with no contact details in the payload. Callbacks and support requests likewise |
| Account lifecycle | Deletion request/status, consent/access revocation and export according to Tatva's approved retention process |

If a contract is absent, record a Tatva backend dependency and show an honest unavailable state. Do not quietly fall back to fixtures or an unrelated API in a production session.

### 6.4 Identity, access and data mapping

- Derive tenant from the authenticated deployment/account mapping. Never trust a client-supplied hospital ID, logo, URL parameter or selected profile as permission.
- Separate **account ID**, **family member ID**, **Tatva patient unique ID**, doctor/clinic IDs and appointment IDs. Keep a stable mapping; phone-number equality alone does not prove access to an existing EMR record.
- Every read/write/file download must authorize account → member → tenant → entity. Test object-ID substitution and cross-family/cross-hospital access.
- Use patient-scoped tokens. Admins inherit staff roles in the portal. Do not place a doctor token in mobile storage, source, logs, collector URLs or client environment configuration.
- Map appointment lifecycle explicitly to UI states. Preserve `externalId` for service-backed appointments and stable IDs through rescheduling.
- Map documents with stable ID, patient ID, title, investigation date, category/type, provider/source (`hospital`, patient upload or `abha`), release state, MIME type, byte size and authorized file reference. UI metadata must not grant file access by itself.
- Use server timestamps and an explicit hospital timezone for slots, cutoff calculations, reminders and record publication windows. Keep date-only investigation dates distinct from timestamps.
- Do not expose unreleased reports, staff notes, other patients' metadata or internal service credentials. Sanitize API errors before displaying them.

### 6.5 Integration behavior and errors

Build service adapters around the existing view models and selectors; replace demo mutations at their boundaries rather than scattering raw requests through screens.

For every API-backed view distinguish **loading**, **success with data**, **verified empty**, **failure**, and **refreshing existing data**. A failed request is not an empty medical history. Abort stale requests on member/tenant changes and key caches by both.

For writes disable duplicate submission, use server idempotency where supported, retain drafts on failure, and reconcile with server truth before showing success. Slot conflicts should return the user to refreshed availability with their other choices intact. Expired sessions prompt reauthentication without publishing a partial write.

Uploads need server-side content/type/size validation, approved file scanning, progress, cancellation, retry and cleanup for abandoned temporary files. Protected short-lived downloads must be authorized and avoid long-lived public medical-document URLs. Never log document contents, OTPs, ABHA identifiers or session tokens.

Keep browser HTTP cache and service worker away from private API responses and medical files unless Tatva defines a deliberate protected offline policy. Web sessions and native secure credential storage require platform-specific implementation. The current localStorage/IndexedDB demo persistence is not that policy.

## 7. Configuration, storage and deployment

### 7.1 Current local state

| Storage | Purpose today | Production replacement |
| --- | --- | --- |
| `tatva-patient-demo-v1` | Sample members, appointments, records, requests, feedback (with member identity), notices and preferences | Tatva-authorized services and scoped client state |
| `tatva-demo-accounts`, demo session/credential keys | Local sign-in demonstration | Tatva patient identity/session lifecycle |
| `tatva-brand-preview` | Saved brand | Versioned Tatva hospital app configuration |
| `tatva-admin-config` | Flags, booking policy, fees, clinic extras/catalogue settings | Tatva admin configuration API |
| IndexedDB via `files.js` | Locally uploaded demo blobs | Tatva document storage/API |
| Scoped BroadcastChannel and storage events | Same-browser preview and saved-data synchronization | Keep preview isolated; use server version/refetch/invalidation for real deployments |

### 7.2 Environment keys

See [`.env.example`](../.env.example). All `VITE_*` values are public bundle configuration, never secrets.

| Key | Purpose |
| --- | --- |
| `VITE_PATIENT_MODE` | `demo` only today; other explicit values fail closed |
| `VITE_SYMPTOM_COLLECTOR_URL` | `mock`, `off` or hosted collector URL |
| `VITE_SYMPTOM_COLLECTOR_SESSION_ENDPOINT` | Optional Tatva-owned same-origin session adapter path |
| `VITE_SYMPTOM_COLLECTOR_ORIGIN` | Expected HTTPS collector origin |
| `VITE_PATIENT_AGENT_ORIGIN` | Collector origin compatibility alias |
| `BRAND_IMPORT_AI_ENABLED` | Server-only opt-in for brand evidence classification |
| `BRAND_IMPORT_MODEL`, `OPENAI_API_KEY` | Server-only classifier settings; optional, never patient/mobile configuration |

`/api/brand-import` runs through the Vite development middleware or the serverless handler in `api/brand-import.js`. Static Capacitor assets cannot execute that Node handler. Host it only in the authenticated Tatva admin backend in production, with rate limits, auditability and the existing URL/redirect/private-network protections retained.

### 7.3 Mobile and store delivery

1. Agree on the hospital/tenant packaging model and app ownership. Configure the build-time app ID/name, icons, splash assets, domains and environment. Current ID is a **demo** reverse-domain identifier.
2. Use `scripts/configure-tenant.mjs` to write Capacitor configuration from the configured default brand; inspect the result. If changing a generated platform's bundle/package ID, regenerate or explicitly migrate the native project instead of assuming `cap sync` renames it.
3. Separate/exclude admin routes and demo tools from the mobile distribution. Runtime admin branding changes can update app content, but cannot rename an installed OS package or silently replace store identity/icons.
4. Integrate verified Tatva patient services, remove demo sign-in/fixtures/reset tools from the production path, and retain fail-closed behavior when configuration is invalid.
5. Validate Android and iOS builds on physical devices: back navigation, deep links, safe areas, keyboard, file picker, PDF viewing, sharing/downloads, camera/microphone if enabled, collector authentication and slow/offline networks.
6. Set up Android signing/AAB and Play Console release; iOS signing/provisioning, archive and App Store Connect if iOS is included. Supply store metadata, support/privacy links, screenshots, permission explanations, data declarations and account-deletion access. Release requirements should be checked against current platform guidance at release time.
7. Establish UAT, staged rollout, monitoring and rollback ownership. A successful `vite build` or `cap sync` does not prove store-release readiness.

PWA assets/manifest and a versioned asset-allowlist service worker are generated for web builds. Development does not register the service worker. It must not cache clinical API responses/uploads. Web hosting must support deep-link rewrites; current Vercel configuration provides SPA routing and the brand-import function separately.

## 8. QA, remaining work and acceptance

Use existing unit/domain tests and targeted Playwright tests before broad regression. Tests are executable examples of intended demo behavior, not proof of live API availability.

- Verify every patient route, selected-member isolation, feature flag, keyboard focus and back/deep-link behavior.
- Booking: past/unavailable slots, conflicts, cancellation window, rescheduling preserving ID, video flags and pending/skipped/completed symptoms.
- Home: all 15 variants, long names, narrow 320 px layouts, one-line heading/subtext and inert carousel clones.
- Records: all six tabs, correct upload ownership, orange/normal empty-state copy, no repeated CTAs, no info icon in empty notices.
- Visits: one row per visit with the right doctor, date and time, medicines (truncated with the full list on hover), clinic and visit-type icon; search matches doctor, medicine and diagnosis; viewer stepper order (newest first; left = older, right = newer; ends disabled), jump list, counter; Written/Digital toggle only when both exist; written-only notice; share, download (PNG for the written copy, PDF for digital) and print; selected-member isolation when switching profiles with the sheet open.
- Upload: 0/1/5 files, sixth file, invalid/empty/oversized file, retry, failed storage, missing fields, future dates, 300-character notes, compact image/PDF thumbnail, remove-last-file and sticky footer transitions.
- Viewer: image/PDF errors, source attribution, document actions, permissions and return to the original records tab.
- ABHA: linked/unlinked transitions, sync deduplication, member isolation, consent failures/revocation, no intermediate chooser.
- Admin: saved/draft/cancel isolation, validated contacts/colors/fonts, logo replacement without tiny artwork, flexible crop frame, website no-result/partial-result/error, preview toggle preserving iframe route and focus.
- Responsive console: at 390, 768, 1024 and 1440 px check App configuration (summary and editor open at the top, no auto-scroll to the phone), Doctors & clinics (clinic facts never overlap, doctor table scrolls sideways on phones) and Patient feedback (pinned header flush, toolbar wraps cleanly, KPIs 1/2/4 columns); no horizontal page overflow anywhere; top-bar tabs scroll and disabled sections stay disabled.
- Feedback: submit from each family member and confirm the name, age, gender and patient ID on the admin page; every period preset and a custom range, including the previous-period deltas and the day/week/month bucket switch; Filter chips, search by comment/name/ID, sort, Reset all; CSV columns match the table; header stays pinned with no top gap; all toolbar controls 42 px on one line at 1136 px and 1440 px; sentiment rule visible on every sentiment surface and in the tooltip; empty states for no feedback and for no matches.
- API integration: expired session, forbidden entity, cross-tenant IDs, pagination, stale responses after switching member, interrupted writes, idempotent retry and no demo fallback.
- Store build: no admin/demo access, real-device accessibility, secure credentials, verified native file/share behavior and release configuration.

### Known limitations and decisions for implementation owners

- Patient authentication/authorization and broad clinical integration are pending. Existing portal service calls require backend review before patient use.
- Branding extraction is heuristic/bounded; manually editable fields remain essential. It does not exhaustively scrape a complete site.
- Legacy UHID labels and old source comments/docs may remain. Current routed behavior and this handoff take precedence; clean these up deliberately, without adding an unverified flow.
- Packages and message administration are not enabled in current navigation. Catalogue persistence and production notifications require Tatva contracts.
- Patient feedback is identifiable to the hospital by product decision (name, age, gender, patient ID; no contact details). The disclosure line on the app's feedback screen and admin-only access are the conditions for shipping it; a consent checkbox is a legal call, not implemented.
- AI analysis, Mira booking, ABHA verification/biometrics and most notifications are demonstrations. Hosted collector mode is an optional separate integration, not proof that all these features are live.
- No patient online payment flow, live queue/check-in route, production account deletion/export, offline clinical-record mode or completed app-store release is delivered by this repository.
- App signing identity, API environments, patient grants, document release rules, missing API contracts and rollout ownership require agreement from the corresponding Tatva teams.

## 9. Copyable context for a developer's agent

> Work in the Tatva Practice Patient App repository. First read `docs/DEVELOPER_HANDOFF.md` and `docs/home-card-contract.md`, then inspect the relevant source/tests. There are two deliverables: patient app administration embedded in the existing authenticated Tatva Practice portal, and a separately distributed Android/iOS patient app. Use only Tatva Practice APIs as the application backend. Existing portal API references are not automatically patient-authorized; confirm the contract and never reuse a staff token. The current repo is demo-only; localStorage/IndexedDB and fixtures must not become the production clinical backend. Preserve selected-member/tenant isolation, feature flags, Tesseract UI, branding/contrast rules, draft-preview isolation and accessible sheet/navigation behavior. Patients upload only in Medical records; Visits, Lab results, Medical history, Discharge summary and Certificates are hospital-published. Preserve the upload initial/selected states, compact thumbnails, 300-character notes and sticky Upload more/Save actions. Keep carousel copy/state selection centralized. Patient feedback is tagged with the active member and shown to admins on `/admin/feedback` with age, gender and patient ID but no contact details; keep the patient-facing disclosure line, the printed sentiment rule (4–5 positive, 3 neutral, 1–2 negative) and the pinned header with its one-line 42 px toolbar. Do not restore removed review steps, duplicate CTAs or intermediate ABHA screens. Identify missing Tatva capabilities explicitly instead of inventing existing endpoints or silently substituting demo data. Run focused checks, report what is actually verified, and distinguish implementation from production/store readiness.
