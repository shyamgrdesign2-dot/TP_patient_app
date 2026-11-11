import { useMemo, useState } from "react";
import {
  BarChart,
  DataTable,
  DateRangePicker,
  DonutChart,
  Dropdown,
  Empty,
  Filter,
  InputBox,
  LineChart,
  SectionCard,
  StatCard,
  Tooltip,
} from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../patient/state/AppContext";
import { dateKey } from "../shared/data";
import { ageLabel } from "../shared/age";
import { Icon } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { Bars, PageTitle } from "./AdminParts";
import s from "./Admin.module.css";

// ---------------------------------------------------------------------------
// Dates. Feedback carries an ISO timestamp; all grouping is on the local day.
const pad = (n) => String(n).padStart(2, "0");
const localDay = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};
const dayDate = (key) => new Date(`${key}T00:00:00`);
const addDays = (key, n) => {
  const d = dayDate(key);
  d.setDate(d.getDate() + n);
  return localDay(d);
};
const monthEnd = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${pad(new Date(y, m, 0).getDate())}`;
};
const shiftMonth = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const fmt = (iso, opts) => new Date(iso).toLocaleString("en-IN", opts);
const shortDate = (iso) => fmt(iso, { day: "numeric", month: "short", year: "numeric" });
const longMonth = (ym) => dayDate(`${ym}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const shortMonth = (ym) => dayDate(`${ym}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
const timeAgo = (iso) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};

const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
const sentiment = (rating) => (rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative");

// How sentiment is derived from the star rating. Stated wherever sentiment
// is shown, in text and in an info tooltip, so nobody has to guess.
export const SENTIMENT_RULE = "Positive = 4–5 stars · Neutral = 3 stars · Negative = 1–2 stars";
function SentimentInfo({ side = "top" }) {
  return (
    <Tooltip side={side} content={`How sentiment is calculated: ${SENTIMENT_RULE}. It is derived from the star rating only; comments are not analysed.`}>
      <button type="button" className={s.fbInfo} aria-label={`How sentiment is calculated: ${SENTIMENT_RULE}`}>
        <Icon name="info-circle" size={16} />
      </button>
    </Tooltip>
  );
}

// Who gave the rating. The app stores the member id plus a snapshot of the
// name, date of birth, gender, relation and patient ID at submission time;
// the live member record wins when it is still in this account. No contact
// details are stored with feedback: follow-up goes through the patient record.
const whoOf = (f, members = []) => {
  const m = f.memberId ? members.find((x) => x.id === f.memberId) : null;
  const src = m || { dob: f.dob, relation: f.relation };
  return {
    name: m?.name || f.patientName || "Not recorded",
    mrn: m?.mrn || f.mrn || null,
    age: ageLabel(src) || null,
    gender: m?.gender || f.gender || null,
    relation: m?.relation || f.relation || null,
  };
};
const whoLine = (who) => [who.age, who.gender, who.mrn].filter(Boolean).join(" · ");

// Gold stars. Filled = amber, empty = slate outline. Colour is never the only
// signal: every instance carries the numeric rating in its label.
export function Stars({ value, size = 14, label }) {
  return (
    <span className={s.stars} role="img" aria-label={label || `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} bulk={value >= n} data-on={value >= n || undefined} />
      ))}
    </span>
  );
}

export const averageRating = (list) =>
  list.length ? Number((list.reduce((n, f) => n + (f.rating || 0), 0) / list.length).toFixed(1)) : null;

export const ratingRows = (list) =>
  [5, 4, 3, 2, 1].map((n) => [`${n} star${n === 1 ? "" : "s"}`, list.filter((f) => f.rating === n).length, n >= 4 ? "brand" : n === 3 ? "soft" : "neutral"]);

// Compact summary used by the Overview card (not the analytics page).
export function FeedbackPanel({ feedback, members = [], limit = 6 }) {
  if (!feedback.length) {
    return <p className={s.hint}>No feedback yet. It appears here as soon as a patient submits a rating.</p>;
  }
  const avg = averageRating(feedback);
  return (
    <div className={s.feedbackGrid}>
      <div className={s.feedbackSummary}>
        <div className={s.meter}>
          <strong>
            {avg.toFixed(1)} <small>of 5</small>
          </strong>
          <Stars value={Math.round(avg)} size={16} label={`Average rating ${avg} out of 5`} />
          <small>Average rating</small>
        </div>
        <Bars label="Responses by rating" rows={ratingRows(feedback)} />
      </div>
      <ul className={s.feedbackList} aria-label="Recent feedback">
        {feedback.slice(0, limit).map((f) => {
          const who = whoOf(f, members);
          return (
            <li key={f.id}>
              <div className={s.feedbackMeta}>
                <span className={s.fbRatingCell}>
                  <Stars value={f.rating} />
                  <small>
                    {who.name}
                    {whoLine(who) ? ` · ${whoLine(who)}` : ""}
                  </small>
                </span>
                <small>{timeAgo(f.createdAt)}</small>
              </div>
              <p>{f.message?.trim() ? f.message : <em>Rating only, no comment</em>}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Period. One Tesseract range picker carries the quick presets (All time,
// Last 30 days, This month, …) and the calendars for a custom range. State is
// either { preset } or { from, to } (inclusive local day keys). A window also
// knows the previous window it is compared against.
const PRESET_LABELS = {
  all: "All time",
  "last-30": "Last 30 days",
  "this-month": "This month",
  "last-month": "Last month",
  "this-year": "This year",
  "last-year": "Last year",
};

function presetWindow(id, today, earliest) {
  const ym = today.slice(0, 7);
  const y = Number(today.slice(0, 4));
  switch (id) {
    case "last-30":
      return { from: addDays(today, -29), to: today, prev: { from: addDays(today, -59), to: addDays(today, -30) }, prevLabel: "the previous 30 days" };
    case "this-month": {
      const prev = shiftMonth(ym, -1);
      return { from: `${ym}-01`, to: today, prev: { from: `${prev}-01`, to: monthEnd(prev) }, prevLabel: longMonth(prev) };
    }
    case "last-month": {
      const m = shiftMonth(ym, -1);
      const prev = shiftMonth(ym, -2);
      return { from: `${m}-01`, to: monthEnd(m), prev: { from: `${prev}-01`, to: monthEnd(prev) }, prevLabel: longMonth(prev) };
    }
    case "this-year":
      return { from: `${y}-01-01`, to: today, prev: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }, prevLabel: String(y - 1) };
    case "last-year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31`, prev: { from: `${y - 2}-01-01`, to: `${y - 2}-12-31` }, prevLabel: String(y - 2) };
    default:
      return { from: earliest, to: today, prev: null, prevLabel: null, open: true };
  }
}

function periodWindow(period, today, earliest) {
  if (period.preset) {
    const w = presetWindow(period.preset, today, earliest);
    return { ...w, label: PRESET_LABELS[period.preset] || "All time" };
  }
  const { from, to } = period;
  const days = Math.round((dayDate(to) - dayDate(from)) / 86400000) + 1;
  return {
    from,
    to,
    prev: { from: addDays(from, -days), to: addDays(from, -1) },
    prevLabel: `the previous ${days} day${days === 1 ? "" : "s"}`,
    label: from === to ? shortDate(dayDate(from)) : `${shortDate(dayDate(from))} – ${shortDate(dayDate(to))}`,
  };
}

const inWindow = (f, w) => {
  if (!w) return false;
  if (w.open) return true;
  const d = localDay(f.createdAt);
  return (!w.from || d >= w.from) && (!w.to || d <= w.to);
};

// Trend buckets: by day up to two weeks, by week up to four months, else by
// month. Empty buckets are kept so gaps show in the bar chart.
function trendBuckets(list, w, today) {
  const first = list.length ? localDay(list[list.length - 1].createdAt) : today;
  const from = w.open ? first : w.from;
  const to = w.to || today;
  const span = Math.round((dayDate(to) - dayDate(from)) / 86400000);
  const unit = span <= 14 ? "day" : span <= 120 ? "week" : "month";
  const keys = [];
  if (unit === "day") for (let k = from; k <= to; k = addDays(k, 1)) keys.push(k);
  else if (unit === "week") for (let k = from; k <= to; k = addDays(k, 7)) keys.push(k);
  else for (let k = from.slice(0, 7); k <= to.slice(0, 7); k = shiftMonth(k, 1)) keys.push(k);
  const keyOf = (iso) => {
    const d = localDay(iso);
    if (unit === "day") return d;
    if (unit === "month") return d.slice(0, 7);
    const offset = Math.floor((dayDate(d) - dayDate(from)) / 86400000 / 7);
    return keys[Math.max(0, Math.min(keys.length - 1, offset))];
  };
  const map = new Map(keys.map((k) => [k, []]));
  list.forEach((f) => map.get(keyOf(f.createdAt))?.push(f));
  const label = (k) => (unit === "month" ? shortMonth(k) : dayDate(k).toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
  return {
    unit,
    buckets: keys.map((k) => {
      const items = map.get(k);
      return {
        x: label(k),
        count: items.length,
        avg: averageRating(items),
        positive: items.filter((f) => f.rating >= 4).length,
        neutral: items.filter((f) => f.rating === 3).length,
        negative: items.filter((f) => f.rating <= 2).length,
      };
    }),
  };
}

const FILTER_GROUPS = [
  { id: "rating", label: "Rating", options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? "" : "s"}` })) },
  {
    id: "sentiment",
    label: "Sentiment (4–5 positive · 3 neutral · 1–2 negative)",
    type: "single",
    options: [
      { value: "positive", label: "Positive (4–5 stars)" },
      { value: "neutral", label: "Neutral (3 stars)" },
      { value: "negative", label: "Negative (1–2 stars)" },
    ],
  },
  {
    id: "comment",
    label: "Comments",
    type: "single",
    options: [
      { value: "with", label: "With a comment" },
      { value: "without", label: "Rating only" },
    ],
  },
];

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest rating" },
  { value: "lowest", label: "Lowest rating" },
];

const csvOf = (list, members) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    "Submitted,Rating,Comment,Patient,Age,Gender,Patient ID",
    ...list.map((f) => {
      const who = whoOf(f, members);
      return [esc(new Date(f.createdAt).toISOString()), f.rating, esc(f.message || ""), esc(who.name), esc(who.age || ""), esc(who.gender || ""), esc(who.mrn || "")].join(",");
    }),
  ].join("\n");
};

// Patient feedback analytics. Everything patients submit from Account →
// Feedback in the app, filterable by period, rating, sentiment and comment,
// with KPIs, trends and the full list for the filtered set. Read-only for the
// hospital; the demo reads the same local state the patient app writes. In
// production this comes from the tenant-scoped feedback service (see
// docs/DEVELOPER_HANDOFF.md, "Support and feedback").
export default function Feedback() {
  const { state } = useApp();
  const all = state.feedback || [];
  const members = state.members || [];
  const today = dateKey();
  const earliest = all.length ? all.reduce((min, f) => (localDay(f.createdAt) < min ? localDay(f.createdAt) : min), today) : today;
  const [period, setPeriod] = useState({ preset: "all" });
  const [filters, setFilters] = useState({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  // Quick presets inside the range picker. "All time" spans from the first
  // response to today so the calendar still shows a highlighted range.
  const presets = useMemo(
    () =>
      Object.entries(PRESET_LABELS).map(([id, label]) => ({
        id,
        label,
        getRange: () => {
          const w = presetWindow(id, today, earliest);
          return { start: dayDate(w.from), end: dayDate(w.to) };
        },
      })),
    [today, earliest],
  );
  const onPeriod = (v) => {
    if (!v || v.range === null || (!v.start && !v.presetId)) return setPeriod({ preset: "all" });
    if (v.type === "preset" && v.presetId) return setPeriod({ preset: v.presetId });
    return setPeriod({ from: localDay(v.start), to: localDay(v.end || v.start) });
  };

  const w = periodWindow(period, today, earliest);
  const ratings = filters.rating || [];
  const mood = filters.sentiment?.[0];
  const comment = filters.comment?.[0];
  const q = query.trim().toLowerCase();
  const matches = (f) => {
    if (ratings.length && !ratings.includes(String(f.rating))) return false;
    if (mood && sentiment(f.rating) !== mood) return false;
    if (comment && (comment === "with" ? !f.message?.trim() : !!f.message?.trim())) return false;
    if (!q) return true;
    const who = whoOf(f, members);
    return [f.message, who.name, who.mrn].some((v) => (v || "").toLowerCase().includes(q));
  };

  const filtered = useMemo(() => {
    const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    const cmp = { newest: byDate, oldest: (a, b) => -byDate(a, b), highest: (a, b) => b.rating - a.rating || byDate(a, b), lowest: (a, b) => a.rating - b.rating || byDate(a, b) }[sort];
    return all.filter((f) => matches(f) && inWindow(f, w)).sort(cmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, members, w.from, w.to, w.open, filters, q, sort]);
  const previous = w.prev ? all.filter((f) => matches(f) && inWindow(f, w.prev)) : null;

  const avg = averageRating(filtered);
  const prevAvg = previous ? averageRating(previous) : null;
  const positive = filtered.filter((f) => f.rating >= 4).length;
  const neutral = filtered.filter((f) => f.rating === 3).length;
  const negative = filtered.length - positive - neutral;
  const positivePct = filtered.length ? pct(positive, filtered.length) : null;
  const prevPositivePct = previous?.length ? pct(previous.filter((f) => f.rating >= 4).length, previous.length) : null;
  const withComment = filtered.filter((f) => f.message?.trim()).length;
  const delta = (now, before) => (now == null || before == null ? undefined : Number((now - before).toFixed(1)));
  const compare = w.prev ? `vs ${w.prevLabel}` : w.label;

  const { unit, buckets } = useMemo(() => trendBuckets(filtered, w, today), [filtered, w.from, w.to, w.open, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const ratingSeries = buckets.filter((b) => b.avg != null).map((b) => ({ x: b.x, avg: b.avg }));
  const spark = buckets.map((b) => b.count);

  const filtersActive = period.preset !== "all" || ratings.length || mood || comment || q || sort !== "newest";
  const reset = () => {
    setPeriod({ preset: "all" });
    setFilters({});
    setQuery("");
    setSort("newest");
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([csvOf(filtered, members)], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `patient-feedback-${today}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      id: "rating",
      header: "Rating",
      width: 150,
      cell: (row) => (
        <span className={s.fbRatingCell}>
          <Stars value={row.rating} size={16} />
          <strong>{row.rating}.0</strong>
        </span>
      ),
    },
    {
      id: "patient",
      header: "Patient",
      width: 220,
      primary: (row) => whoOf(row, members).name,
      secondary: (row) => whoLine(whoOf(row, members)) || "No patient details",
    },
    {
      id: "message",
      header: "Comment",
      cell: (row) => (row.message?.trim() ? <p className={s.fbComment}>{row.message}</p> : <p className={s.fbComment} data-empty>Rating only, no comment</p>),
    },
    {
      id: "createdAt",
      header: "Submitted",
      width: 170,
      primary: (row) => shortDate(row.createdAt),
      secondary: (row) => `${fmt(row.createdAt, { hour: "numeric", minute: "2-digit" })} · ${timeAgo(row.createdAt)}`,
    },
  ];

  const summary = [
    w.label,
    ratings.length ? `${[...ratings].sort().reverse().join(", ")} star` : null,
    mood ? FILTER_GROUPS[1].options.find((o) => o.value === mood)?.label : null,
    comment ? (comment === "with" ? "with a comment" : "rating only") : null,
    q ? `matching “${query.trim()}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const card = (title, subtitle, icon, body, extra = {}) => (
    <SectionCard title={title} subtitle={subtitle} icon={<Icon name={icon} size={18} bulk />} tone="neutral" padding={20} divided={false} {...extra}>
      {body}
    </SectionCard>
  );

  return (
    <>
      {/* Title and filters stay pinned while the analytics scroll underneath,
          so the admin always sees which period and filters apply. */}
      <div className={s.fbSticky}>
        <PageTitle title="Patient feedback" sub="Ratings and comments patients share from Account → Feedback in the app." />
        {all.length > 0 && (
          <div className={s.fbToolbar} role="region" aria-label="Filters">
            <div className={s.fbSearch}>
              <InputBox type="search" size="md" surface="muted" fullWidth leftIcon={<Icon name="search-normal" size={16} />} placeholder="Search comments, patients, IDs" aria-label="Search comments, patients and patient IDs" clearable value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className={s.fbTools}>
              {filtersActive ? (
                <Button variant="ghost" size="sm" onClick={reset}>
                  Reset all
                </Button>
              ) : null}
              <div className={s.fbRange}>
                <DateRangePicker
                  mode="range"
                  size="md"
                  months={2}
                  showPresets
                  presets={presets}
                  aria-label="Period"
                  placeholder="Period"
                  maxDate={dayDate(today)}
                  value={period.preset ? period.preset : { start: dayDate(period.from), end: dayDate(period.to) }}
                  onChange={onPeriod}
                />
              </div>
              <div className={s.fbSort}>
                <Dropdown ariaLabel="Sort" label="" width="trigger" leadingIcon={<Icon name="sort" size={16} />} options={SORTS} value={sort} onChange={(v) => setSort(typeof v === "string" ? v : v?.value || "newest")} />
              </div>
              <Filter className={s.fbFilter} groups={FILTER_GROUPS} value={filters} onChange={setFilters} />
              <Tooltip content={filtered.length ? `Download the ${filtered.length} filtered response${filtered.length === 1 ? "" : "s"} as CSV` : "Nothing to export"} side="bottom">
                <Button variant="outline" size="sm" className={s.fbExport} aria-label="Export CSV" leftIcon={<Icon name="document-download" size={16} />} onClick={exportCsv} disabled={!filtered.length}>
                  CSV
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {all.length === 0 ? (
        <SectionCard tone="neutral" padding={40} divided={false}>
          <Empty icon="message-favorite" title="No feedback yet" description="Ratings patients submit from Account → Feedback in the app appear here as soon as they are saved." />
        </SectionCard>
      ) : (
        <>
          <div className={s.fbKpis}>
            <StatCard
              label="Average rating"
              value={avg == null ? "—" : avg.toFixed(1)}
              delta={delta(avg, prevAvg)}
              deltaSuffix=""
              footer={
                <span className={s.fbKpiFoot}>
                  <Stars value={avg ? Math.round(avg) : 0} size={14} label={avg ? `Average rating ${avg} out of 5` : "No ratings"} />
                  {avg != null ? `out of 5 · ${compare}` : "No responses in this period"}
                </span>
              }
              icon={<Icon name="star" size={16} bulk />}
              showSparkline={false}
            />
            <StatCard label="Responses" value={filtered.length} format={(v) => String(v)} delta={delta(filtered.length, previous?.length)} deltaSuffix="" footer={compare} icon={<Icon name="message-favorite" size={16} bulk />} spark={spark} sparkColor="var(--tesseract-blue-500)" sparkPosition="side" showSparkline={spark.length > 1} />
            <StatCard
              label="Positive share"
              value={positivePct == null ? "—" : `${positivePct}%`}
              delta={delta(positivePct, prevPositivePct)}
              deltaSuffix=" pts"
              footer={
                <span className={s.fbKpiFoot}>
                  4–5 star responses · {compare}
                  <SentimentInfo />
                </span>
              }
              icon={<Icon name="heart" size={16} bulk />}
              showSparkline={false}
            />
            <StatCard label="With a comment" value={withComment} format={(v) => String(v)} footer={filtered.length ? `${pct(withComment, filtered.length)}% of responses` : "No responses in this period"} icon={<Icon name="message-text" size={16} bulk />} showSparkline={false} />
          </div>

          <div className={s.fbCharts}>
            {card(
              "Average rating over time",
              `${w.label} · per ${unit}${unit === "week" ? " (week starting)" : ""}`,
              "star",
              ratingSeries.length ? (
                <LineChart data={ratingSeries} xKey="x" series={[{ key: "avg", label: "Average rating", color: "var(--tesseract-amber-500)" }]} height={220} yMin={1} yMax={5} yTickCount={5} yFormat={(v) => String(v)} curve="linear" markers markerSize={3} area areaOpacity={0.1} showLegend={false} xTickCount={8} emptyText="No responses match these filters" />
              ) : (
                <Empty size="sm" icon="search-normal" title="No responses match" description="Widen the period or clear a filter." />
              ),
              { iconColor: "var(--tesseract-amber-600)" },
            )}

            {card(
              "Responses by sentiment",
              `${w.label} · per ${unit} · ${SENTIMENT_RULE}`,
              "message-favorite",
              <BarChart
                data={buckets}
                xKey="x"
                series={[
                  { key: "positive", label: "Positive", color: "var(--tesseract-success-500)" },
                  { key: "neutral", label: "Neutral", color: "var(--tesseract-amber-400)" },
                  { key: "negative", label: "Negative", color: "var(--tesseract-error-400)" },
                ]}
                stacked
                height={220}
                barRadius={4}
                barPadding={0.3}
                yTickCount={4}
                valueFormat={(v) => String(v)}
                legendPosition="bottom"
                emptyText="No responses match these filters"
              />,
              { headerActions: <SentimentInfo side="left" /> },
            )}

            {card(
              "Rating distribution",
              `${filtered.length} response${filtered.length === 1 ? "" : "s"}`,
              "star",
              <BarChart data={[5, 4, 3, 2, 1].map((n) => ({ x: `${n} ★`, count: filtered.filter((f) => f.rating === n).length }))} xKey="x" series={[{ key: "count", label: "Responses", color: "var(--tesseract-amber-500)" }]} horizontal height={200} barRadius={4} barPadding={0.35} valueLabels showLegend={false} showGrid={false} yTickCount={4} valueFormat={(v) => String(v)} emptyText="No responses match these filters" />,
              { iconColor: "var(--tesseract-amber-600)" },
            )}

            {card(
              "Sentiment split",
              `${positivePct ?? 0}% positive · ${SENTIMENT_RULE}`,
              "heart",
              <DonutChart
                data={[
                  { label: "Positive", value: positive, color: "var(--tesseract-success-500)" },
                  { label: "Neutral", value: neutral, color: "var(--tesseract-amber-400)" },
                  { label: "Negative", value: negative, color: "var(--tesseract-error-400)" },
                ]}
                height={200}
                centerLabel="Responses"
                legend="right"
                showPercent
                showValue
                valueFormat={(v) => String(v)}
                emptyText="No responses match these filters"
              />,
              { headerActions: <SentimentInfo side="left" /> },
            )}
          </div>

          {card(
            "Responses",
            `${filtered.length} of ${all.length} · ${summary}`,
            "message-text",
            <>
              {filtered.length ? (
                <div className={s.tableScroll}>
                  <DataTable className={s.fbTable} columns={columns} data={filtered} rowHeight="lg" pageSize={8} pageSizeOptions={[8, 16, 32]} hoverable={false} />
                </div>
              ) : (
                <Empty size="sm" icon="search-normal" title="No responses match" description="Widen the period or clear a filter." action={<Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>} />
              )}
              <p className={s.hint}>Each response shows the patient who submitted it with their age, gender and patient ID. Contact details are not stored with feedback; follow up through the patient record.</p>
            </>,
          )}
        </>
      )}
    </>
  );
}
