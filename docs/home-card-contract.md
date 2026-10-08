# Home care-card contract

`src/patient/services/careUpdates.js` selects patient-scoped events from synchronous demo state. The hero is not a permanent list of categories.

## Eligibility and precedence

| Priority | Event                  | Visibility                                      | Appearance and action                                                                                                                                                 |
| -------- | ---------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0        | Checked-in appointment | Confirmed, today, check-in complete             | Deep green token banner; amber with “Longer wait” above the supplied expected wait, or 30 minutes if absent. Add symptoms while pending; review symptoms once shared. |
| 10       | Appointment today      | Confirmed, same day                             | Brand gradient, doctor and time. Share symptoms, then check in for in-clinic visits; view details for video visits.                                                   |
| 15       | Overdue bill           | Outstanding with a past due date                     | Amber payment banner. View bills.                                                                                                                                     |
| 20       | New hospital record    | Released, unseen, published in last 7 days      | Blue-tonal report banner. Open that document.                                                                                                                         |
| 30       | Upcoming appointment   | Confirmed within next 30 days                   | Brand gradient, nearest date/time first. Open visit details.                                                                                                          |
| 40       | Recent hospital record | Released within last 7 days, already seen       | Blue-tonal report banner. Open document.                                                                                                                              |
| 50       | New bill               | Outstanding, issued within last 14 days or due today | Amber payment banner. View bills.                                                                                                                                     |
| 60       | Latest completed visit | Completed within last 30 days                   | Deep green banner. Open completed-visit details.                                                                                                                      |

One card per category (appointments, records, payments, completed). Multiple relevant bills are summed; paid bills disappear. Recent means today through the inclusive day boundary. Unreleased records and patient uploads do not trigger a hospital-update banner. Unseen records rank ahead of seen ones. Other family members’ events never enter this selection.

- No history and no eligible events: one welcome card, “Let’s plan your first visit”, leading to doctor search. It disappears when relevant activity exists.
- Returning patient with no eligible events: no hero; show home actions and records directly. Cancelled/stale entities never become filler cards.
- One eligible event: a full-width card, no dots or swipe loop.
- Two to four: swipe loop with ~8–9% angled neighbours, dots and keyboard arrows. No automatic rotation or arrow controls.
- Changing the event-category set resets selection. Content changes within existing slots update in place. Covered cards become inert while the foreground home sheet scrolls over them.

The whole active card and its CTA open the same destination. The CTA provides keyboard access. Compact 16px-corner banners keep details and CTA in one footer row. Faded Tesseract grids sit left and generated clinic/laboratory photographs sit right. Decorative category glyphs are removed. The track clips vertical overflow and accepts horizontal gestures only. Colour is reinforced by explicit status text.

## Check-in

The visit flow is confirmation → symptom questions → reviewed summary → location check-in → queue token. The Home appointment CTA leads to symptom collection while preparation is pending. The queue page offers collection first; patients can explicitly skip it without losing access to care. Saved intake is attached to the visit and can be reviewed before check-in. Pre-booking intake is reused when its patient and note match the confirmed booking.

`verifyArrival` rejects non-confirmed/online/wrong-day appointments, missing hospital coordinates, malformed or stale (>2 minutes) readings, accuracy worse than 100m, and readings whose distance plus accuracy exceeds the site radius (default 250m). Permission-denied and unavailable-location states offer reception as the fallback. Location is checked once and not persisted. A successful reducer mutation allocates a local sequence token idempotently and the home appointment banner becomes a queue banner. Demo wait = six minutes per checked-in patient ahead.

These are presentation/demo rules, not an anti-spoofing or authoritative queue system. Server integration must validate tenant/patient authorization, site coordinates, appointment window and arrival evidence; atomically allocate queue tokens; publish live wait and status changes; and clear queue state when a visit finishes or is cancelled. Geolocation alone cannot prove physical presence.

## Backend boundary

Use validated appointment/record/invoice entities and inject tenant doctor/location directories through the selector’s fourth argument. UI labels, patterns, safe routes and gradients belong to the client. Never accept executable HTML, arbitrary URLs or CSS from card payloads.

Live APIs must distinguish loading, error and verified-empty results so a failed fetch does not masquerade as a first-time user. Use hospital timezone, authoritative balances/currency, released-record permissions and expected-wait estimates. These asynchronous states are not implemented in the synchronous local demo.

Tests exercise all 16 event combinations, priority, first-time/returning states, inclusive windows, video appointments, profile isolation, wait thresholds and geofence boundaries.

## Symptom reminders

Home has no separate symptom strip or floating symptom carousel. The appointment/queue banner is the Home entry; upcoming visit cards and queue details also offer Add symptoms while intake is pending. Skipping intake or checking in does not complete it. The queue hero retains date, appointment time, wait estimate and a location icon alongside the hospital. All symptom actions use a pale Tesseract AI gradient, darker gradient text and a plus icon, and open the full-page collector directly.

The visible visit type is In clinic (hospital bulk icon) or Video consultation (video bulk icon). The existing internal In-person enum is retained for stored demo appointments and check-in compatibility.
