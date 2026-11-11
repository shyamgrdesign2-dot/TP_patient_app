# Patient feedback in the admin console

Everything a patient submits from **Account → Feedback** in the patient app is
visible to the hospital in the admin console, under **Patient feedback**
(`/admin/feedback`). This note explains what the page shows, how it is built,
where the data comes from today, and what changes for production.

## What the patient submits

The feedback screen in the app asks for a star rating (1–5, required) and an
optional comment (up to 1,000 characters). Each submission is stored as:

| Field       | Value                                   |
| ----------- | --------------------------------------- |
| `id`        | UUID                                    |
| `rating`    | 1–5                                     |
| `message`   | Free text, may be empty                 |
| `createdAt` | ISO timestamp of submission             |

No patient identity is attached. The app stores only the rating, the comment
and the time. If the hospital later wants to follow up on individual comments,
the app must ask the patient for consent to attach their name, and the record
and this page must change accordingly.

## What the admin sees

The page is a feedback analytics view, built from the Tesseract design system
(`@dhspl-tatvacare/tesseract-ui` 1.1.0) and the hospital console shell.

### Filters (toolbar)

| Control            | Behaviour                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Period segments    | All time · Last 30 days · Month · Year · Date range.                                                      |
| Month picker       | Appears for Month. Defaults to the current month. Tesseract `DatePicker` in `month` mode.                 |
| Year picker        | Appears for Year. Tesseract `DatePicker` in `year` mode.                                                  |
| Date range picker  | Appears for Date range. Two calendars, inclusive of both ends. Tesseract `DateRangePicker`.               |
| Search             | Case-insensitive match on the comment text.                                                               |
| Sort               | Newest first · Oldest first · Highest rating · Lowest rating.                                             |
| Filter             | Tesseract `Filter` panel: Rating (multi-select 1–5), Sentiment (positive / neutral / negative), Comments (with a comment / rating only). Selected options appear as removable chips. |
| Reset all          | Clears period, search, sort and filter in one go. Shown only when something is active.                    |
| Export CSV         | Downloads the currently filtered set as `patient-feedback-<date>.csv` (Submitted, Rating, Comment).       |

Every number and chart on the page reflects the filtered set.

### KPI tiles

Tesseract `StatCard`s. When the period has a previous window (last 30 days,
a month, a year, or a date range), each tile shows the change against that
window.

- **Average rating** out of 5, with gold stars, and the change vs the previous period.
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
(stars and number), Comment (full text, wraps), Submitted (date, time, time
ago). Rating-only submissions are labelled as such.

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
the last eight months so the analytics have something to show. They are added
once for the built-in demo profiles only. Feedback submitted by a newly
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
| `src/patient/pages/Account.jsx`     | The patient-side feedback form (unchanged).                          |

## For production

Replace the localStorage read with the tenant-scoped feedback service listed
in `DEVELOPER_HANDOFF.md` under "Support and feedback". The page needs:

- A list endpoint returning `{ id, rating, message, createdAt }` for the
  hospital, filterable server-side by date range (the client can keep the
  rating/sentiment/comment filters and sorting for the page it has).
- Pagination once volumes grow. The table is already paginated client-side.
- Role check: admins and admin doctors only, like the rest of the console.
- CSV export can stay client-side for the filtered page, or move to the
  service if the hospital wants the full history.

Do not attach patient identity to feedback without an explicit consent step
in the app and a corresponding change to the record and this page.
