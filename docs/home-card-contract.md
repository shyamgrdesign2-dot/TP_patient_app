# Home care-card content and states

The source of truth is `src/patient/services/careUpdates.js`. Each branch keeps the status tag, middle heading/subtext, footer details and CTA together. `CareCarousel.jsx` renders that payload without choosing business states. Edit copy in the selector, not in the renderer.

Cards keep stable category slots: Appointments, Health records, ABHA, and optional Preventive care. Each has one current state for the active patient. The `variant` field (also exposed as `data-variant`) identifies the exact content/action state; `state` retains the category lifecycle.

## Complete content matrix

Dynamic values in brackets come from the selected patient’s data.

| Category / variant            | Status tag        | Heading · subtext                                         | Footer                                 | CTA              |
| ----------------------------- | ----------------- | --------------------------------------------------------- | -------------------------------------- | ---------------- |
| Appointments / welcome        | Book a visit      | Book your first visit · Choose a doctor and time.         | In clinic or by video                  | Find a doctor    |
| Appointments / available      | Book a visit      | Plan your next visit · Choose a doctor and time.          | In clinic or by video                  | Find a doctor    |
| Appointments / upcoming       | Confirmed         | [Doctor] · [Specialty]                                    | [Date, time, hospital]                 | View visit       |
| Appointments / needs-symptoms | Confirmed         | [Doctor] · [Specialty]                                    | [Today, time, hospital]                | Add symptoms     |
| Appointments / completed      | Completed         | [Doctor] · [Specialty]                                    | [Date, time, hospital]                 | View summary     |
| Records / empty               | Getting started   | Your health records · Hospital and uploaded records.      | Visits · Lab results · Medical records | Add a record     |
| Records / history             | Your records      | Your health history · All your records in one place.      | [Count] saved records                  | View records     |
| Records / new                 | New report        | Your report is ready. · [Report title]                    | [Date, category]                       | View report      |
| Records / available           | Recently added    | Your latest record · [Report title]                       | [Date, category]                       | View report      |
| ABHA / unlinked               | Not linked        | Connect your health · Link ABHA to your profile.          | One health identity                    | Link ABHA        |
| ABHA / linked                 | Linked            | [ABHA address] · [Masked number]                          | Your health identity                   | View ABHA card   |
| Packages / empty              | Stay a step ahead | Care for a healthier you · Preventive care in one place.  | Care for your whole family             | Explore packages |
| Packages / available          | Stay a step ahead | Care for a healthier you · Health checks, tests and more. | [Starting price, or family-care text]  | Explore packages |
| Packages / requested          | Request sent      | [Package name] · Your next step to better health.         | [Date, clinic]                         | View booking     |
| Packages / confirmed          | Confirmed         | [Package name] · Your next step to better health.         | [Date, clinic]                         | View booking     |

## Selection and transitions

- Choose the earliest confirmed appointment within 30 days, inclusive. Same-day in-person visits with missing, unskipped symptom intake use `needs-symptoms`. Prepared, skipped, future and video visits use `upcoming` with View visit.
- Without an upcoming appointment, show the latest completed visit within 30 days. Otherwise show `welcome` for no appointment history or `available` for existing history. Cancelled or stale appointments never produce an active visit CTA.
- Released hospital records published within 7 days are eligible for `new` or `available`; prefer unseen reports, then the latest publication. Patient uploads and unreleased reports never trigger a new hospital-report banner. With no recent hospital report, released records (including uploads) yield `history`; no released records yields `empty`.
- ABHA follows the active patient’s saved link. Unlinking returns the card to `unlinked`.
- Preventive care appears only when the hospital enables packages. A current Requested or Confirmed booking takes precedence over the listed catalog. Cancelled and past bookings fall back to the catalog or empty state.
- All three areas update together from the selected payload. There are no invented wait times, queue statuses or payment states in these banners.

## Presentation and integration

Headings and subtext stay on one line. Static copy is short; dynamic text scales down to a readable minimum, then ellipsizes with the full value in its title and destination screen. Footer details may wrap. AI symptom actions retain their AI gradient outline.

Each current card has a keyboard-accessible CTA. Inactive loop duplicates are inert. Stable category slots preserve the carousel position when content changes; changing the patient or category set resets it.

The selector accepts tenant doctor/location/config data through its fourth argument. Missing doctor, report or package names have safe display fallbacks. Routes are assembled locally and record identifiers encoded where needed. No other family member’s data participates in selection.

The current store is synchronous. Real API integration must distinguish loading, failure and verified-empty results before using this selector, rather than presenting an empty state for a failed request. Patient authorization, release permissions and hospital timezone remain server responsibilities.

`tests/care-updates.test.js` covers eligibility, date boundaries, profile isolation, action transitions and completeness of all variants. `tests/e2e/carousel-mobile.spec.js` covers narrow layouts and long content.
