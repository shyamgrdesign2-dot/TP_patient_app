# Patient feedback in the admin console

Everything a patient submits from **Account → Feedback** in the patient app is
visible to the hospital in the admin console, under **Patient feedback**
(`/admin/feedback`). This note explains what the page shows, how it is built,
where the data comes from today, and what changes for production.

## What the patient submits

The feedback screen in the app asks for a star rating (1–5, required) and an
optional comment (up to 1,000 characters). Each submission is stored as:

| Field         | Value                                                        |
| ------------- | ------------------------------------------------------------ |
| `id`          | UUID                                                         |
| `rating`      | 1–5                                                          |
| `message`     | Free text, may be empty                                      |
| `createdAt`   | ISO timestamp of submission                                  |
| `memberId`    | The family member who was active when the rating was given   |
| `patientName` | Snapshot of that member's name at submission time            |
| `dob`         | Snapshot of the member's date of birth (age is derived)      |
| `gender`      | Snapshot of the member's gender                              |
| `mrn`         | Snapshot of the member's patient ID (MRN)                    |
| `relation`    | Snapshot of the relation (Self, Father, …)                   |

The console resolves `memberId` against the live member record first and
falls back to the snapshot, so a renamed member shows the current name while
a deleted one still shows who gave the rating. No contact details are stored
with feedback; follow-up goes through the patient record by patient ID.

Older submissions made before identity was attached show "Not recorded".

Because feedback names the patient, the app's feedback screen says so above
the Save button: "Shared with the hospital as <name> (<patient ID>), so they
can follow up if needed." Swap this for a consent checkbox if legal asks for
one.

## What the admin sees

The page is a feedback analytics view, built from the Tesseract design system
(`@dhspl-tatvacare/tesseract-ui` 1.1.0) and the hospital console shell.

### Filters (toolbar)

| Control            | Behaviour                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Period             | One Tesseract `DateRangePicker`. Its preset rail offers All time · Last 30 days · This month · Last month · This year · Last year; the two calendars pick any custom range (inclusive of both ends). A preset or range commits on Apply or on clicking outside. |
| Search             | Case-insensitive match on the comment text, the patient's name and the patient ID.                        |
| Sort               | Newest first · Oldest first · Highest rating · Lowest rating.                                             |
| Filter             | Tesseract `Filter` panel: Rating (multi-select 1–5), Sentiment (positive / neutral / negative), Comments (with a comment / rating only). Selected options appear as removable chips. |
| Reset all          | Clears period, search, sort and filter in one go. Shown only when something is active.                    |
| Export CSV         | Downloads the currently filtered set as `patient-feedback-<date>.csv` (Submitted, Rating, Comment).       |

Every number and chart on the page reflects the filtered set. The title and
the toolbar stay pinned at the top while the analytics scroll underneath, so
the active period and filters are always in view.

### KPI tiles

Tesseract `StatCard`s. When the period has a previous window (last 30 days,
a month, a year, or a date range), each tile shows the change against that
window.

- **Average rating** out of 5, with gold stars, and the change vs the previous period. "This month" compares to last month, "This year" to last year, a custom range to the range of the same length before it.
- **Responses** with a sparkline of responses over time and the change in count.
- **Positive share**: percentage of 4–5 star responses, change in percentage points.
- **With a comment**: how many responses carried text, and the share.

### Charts

- **Average rating over time** (`LineChart`, amber): average per bucket.
- **Responses by sentiment** (`BarChart`, stacked): positive 4–5, neutral 3, negative 1–2 per bucket.
- **Rating distribution** (`BarChart`, horizontal): count per star.
- **Sentiment split** (`DonutChart`): positive / neutral / negative with counts and percentages.

Buckets adapt to the span of the period: per day up to two weeks, per week up
to four months, otherwise per month. Empty buckets are kept so gaps are
visible.

### Responses table

Tesseract `DataTable`, 8 rows per page (16 or 32 selectable). Columns: Rating
(stars and number), Patient (name, then age · gender · patient ID), Comment
(full text, wraps), Submitted (date, time, time ago). Rating-only submissions
are labelled as such. The CSV export carries the same columns.

### Empty states

- No feedback at all: a Tesseract `Empty` state explaining where feedback comes from.
- Filters that match nothing: a smaller empty state with a reset action.

## Where the data lives today

This is the demo. The patient app and the admin console run on the same
origin and share one localStorage key (`tatva-patient-demo-v1`). The patient
app writes the `feedback` list; the console reads it through the shared
`useApp()` state. A submission in the app appears on the admin page on the
next render, in the same browser only.

The demo state seeds 24 sample feedback entries (flagged `demo: true`) across
the last eight months, spread over the three demo family members, so the
analytics have something to show. They are added once for the built-in demo
profiles only. Feedback submitted by a newly
registered test patient is never mixed with seed data.

The Overview page also carries a compact feedback card, for when that page is
enabled in the console navigation.

## Files

| File                                | Role                                                                 |
| ----------------------------------- | -------------------------------------------------------------------- |
| `src/admin/Feedback.jsx`            | The analytics page: filters, period windows, buckets, charts, table, CSV. |
| `src/admin/AdminApp.jsx`            | Adds the **Patient feedback** nav item and route.                    |
| `src/admin/AdminParts.jsx`          | Shared `Bars` component (used by Overview and the compact panel).    |
| `src/admin/Overview.jsx`            | Compact feedback card for the Overview page.                         |
| `src/admin/Admin.module.css`        | Layout styles (`fb*` classes) and the gold star colour.              |
| `src/shared/data.js`                | Seed feedback (`demoFeedback`) and `seedVersion` 8.                  |
| `src/patient/state/AppContext.jsx`  | One-time migration that adds seed feedback to existing demo saves.   |
| `src/patient/pages/Account.jsx`     | The patient-side feedback form; attaches the active member's identity. |

## For production

Replace the localStorage read with the tenant-scoped feedback service listed
in `DEVELOPER_HANDOFF.md` under "Support and feedback". The page needs:

- A list endpoint returning `{ id, rating, message, createdAt, patient: { id, name, mrn, age, gender } }`
  for the hospital, filterable server-side by date range (the client can keep
  the rating/sentiment/comment filters and sorting for the page it has). Do
  not include contact details in the feedback payload.
- Pagination once volumes grow. The table is already paginated client-side.
- Role check: admins and admin doctors only, like the rest of the console.
- CSV export can stay client-side for the filtered page, or move to the
  service if the hospital wants the full history.

Patient identity on feedback is a product decision (the hospital wants to
follow up on reviews). Keep contact details out of the feedback record, keep
the "shared with the hospital" line on the app's feedback screen, and restrict
the page to admin roles.
