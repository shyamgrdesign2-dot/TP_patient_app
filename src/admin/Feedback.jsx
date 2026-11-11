import { useMemo, useState } from "react";
import {
  BarChart,
  DataTable,
  DatePicker,
  DateRangePicker,
  DonutChart,
  Dropdown,
  Empty,
  Filter,
  InputBox,
  LineChart,
  SectionCard,
  SegmentedControl,
  StatCard,
  Tooltip,
} from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../patient/state/AppContext";
import { dateKey } from "../shared/data";
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
export function FeedbackPanel({ feedback, limit = 6 }) {
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
        {feedback.slice(0, limit).map((f) => (
          <li key={f.id}>
            <div className={s.feedbackMeta}>
              <Stars value={f.rating} />
              <small>{timeAgo(f.createdAt)}</small>
            </div>
            <p>{f.message?.trim() ? f.message : <em>Rating only, no comment</em>}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Period. A window is { from, to } of inclusive local day keys (null = open),
// plus the previous window of the same length for the change figures.
const PERIODS = [
  { value: "all", label: "All time" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "range", label: "Date range" },
];

function periodWindow(period, today) {
  switch (period.mode) {
    case "30d":
      return { from: addDays(today, -29), to: today, prev: { from: addDays(today, -59), to: addDays(today, -30) }, label: "Last 30 days", prevLabel: "the previous 30 days" };
    case "month": {
      const ym = period.month || today.slice(0, 7);
      const prev = shiftMonth(ym, -1);
      return { from: `${ym}-01`, to: monthEnd(ym), prev: { from: `${prev}-01`, to: monthEnd(prev) }, label: longMonth(ym), prevLabel: longMonth(prev) };
    }
    case "year": {
      const y = Number(period.year || today.slice(0, 4));
      return { from: `${y}-01-01`, to: `${y}-12-31`, prev: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }, label: String(y), prevLabel: String(y - 1) };
    }
    case "range": {
      const { from = null, to = null } = period;
      let prev = null;
      if (from && to) {
        const days = Math.round((dayDate(to) - dayDate(from)) / 86400000) + 1;
        prev = { from: addDays(from, -days), to: addDays(from, -1) };
      }
      const label = from && to ? `${shortDate(dayDate(from))} – ${shortDate(dayDate(to))}` : from ? `From ${shortDate(dayDate(from))}` : to ? `Until ${shortDate(dayDate(to))}` : "All time (pick a date range)";
      return { from, to, prev, label, prevLabel: "the previous period of the same length" };
    }
    default:
      return { from: null, to: null, prev: null, label: "All time", prevLabel: null };
  }
}

const inWindow = (f, w) => {
  if (!w) return false;
  const d = localDay(f.createdAt);
  return (!w.from || d >= w.from) && (!w.to || d <= w.to);
};

// Trend buckets: by day up to two weeks, by week up to four months, else by
// month. Empty buckets are kept so gaps show in the bar chart.
function trendBuckets(list, w, today) {
  const first = list.length ? localDay(list[list.length - 1].createdAt) : today;
  const from = w.from || first;
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

// Date pickers emit a Date or a small object depending on mode; normalise.
const pickedMonth = (v) => (v instanceof Date ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}` : v?.year != null ? `${v.year}-${pad((v.month ?? 0) + 1)}` : v?.start ? localDay(v.start).slice(0, 7) : null);
const pickedYear = (v) => (v instanceof Date ? v.getFullYear() : v?.year ?? v?.start?.getFullYear?.() ?? (Number(v) || null));
const pickedRange = (v) => (v instanceof Date ? { from: localDay(v), to: localDay(v) } : v?.start ? { from: localDay(v.start), to: v.end ? localDay(v.end) : localDay(v.start) } : { from: null, to: null });

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

const csvOf = (list) => {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return ["Submitted,Rating,Comment", ...list.map((f) => [esc(new Date(f.createdAt).toISOString()), f.rating, esc(f.message || "")].join(","))].join("\n");
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
  const today = dateKey();
  const [period, setPeriod] = useState({ mode: "all" });
  const [filters, setFilters] = useState({});
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");

  const w = periodWindow(period, today);
  const ratings = filters.rating || [];
  const mood = filters.sentiment?.[0];
  const comment = filters.comment?.[0];
  const q = query.trim().toLowerCase();
  const matches = (f) =>
    (!ratings.length || ratings.includes(String(f.rating))) &&
    (!mood || sentiment(f.rating) === mood) &&
    (!comment || (comment === "with" ? !!f.message?.trim() : !f.message?.trim())) &&
    (!q || (f.message || "").toLowerCase().includes(q));

  const filtered = useMemo(() => {
    const byDate = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
    const cmp = { newest: byDate, oldest: (a, b) => -byDate(a, b), highest: (a, b) => b.rating - a.rating || byDate(a, b), lowest: (a, b) => a.rating - b.rating || byDate(a, b) }[sort];
    return all.filter((f) => matches(f) && inWindow(f, w)).sort(cmp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, w.from, w.to, filters, q, sort]);
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

  const { unit, buckets } = useMemo(() => trendBuckets(filtered, w, today), [filtered, w.from, w.to, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const ratingSeries = buckets.filter((b) => b.avg != null).map((b) => ({ x: b.x, avg: b.avg }));
  const spark = buckets.map((b) => b.count);

  const filtersActive = period.mode !== "all" || ratings.length || mood || comment || q;
  const reset = () => {
    setPeriod({ mode: "all" });
    setFilters({});
    setQuery("");
    setSort("newest");
  };
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([csvOf(filtered)], { type: "text/csv;charset=utf-8" }));
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
      id: "message",
      header: "Comment",
      cell: (row) => (row.message?.trim() ? <p className={s.fbComment}>{row.message}</p> : <p className={s.fbComment} data-empty>Rating only, no comment</p>),
    },
    {
      id: "createdAt",
      header: "Submitted",
      width: 180,
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

  return (
    <>
      <PageTitle
        title="Patient feedback"
        sub="Ratings and comments patients share from Account → Feedback in the app."
        action={
          <Button variant="outline" size="sm" leftIcon={<Icon name="document-download" size={16} />} onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </Button>
        }
      />

      {all.length === 0 ? (
        <SectionCard tone="neutral" padding={40} divided={false}>
          <Empty icon="message-favorite" title="No feedback yet" description="Ratings patients submit from Account → Feedback in the app appear here as soon as they are saved." />
        </SectionCard>
      ) : (
        <>
          <div className={s.fbToolbar} role="region" aria-label="Filters">
            <div className={s.fbToolbarRow}>
              <div className={s.fbToolbarGroup}>
                <SegmentedControl aria-label="Period" className={s.fbPeriod} size="sm" variant="block" radius={10} options={PERIODS} value={period.mode} onValueChange={(mode) => setPeriod({ ...period, mode })} />
                {period.mode === "month" && (
                  <DatePicker mode="month" size="sm" fullWidth={false} aria-label="Month" maxDate={dayDate(today)} value={dayDate(`${period.month || today.slice(0, 7)}-01`)} onChange={(v) => setPeriod({ ...period, month: pickedMonth(v) || period.month })} />
                )}
                {period.mode === "year" && (
                  <DatePicker mode="year" size="sm" fullWidth={false} aria-label="Year" maxDate={dayDate(today)} value={new Date(Number(period.year || today.slice(0, 4)), 0, 1)} onChange={(v) => setPeriod({ ...period, year: pickedYear(v) || period.year })} />
                )}
                {period.mode === "range" && (
                  <DateRangePicker mode="range" size="sm" fullWidth={false} months={2} showPresets={false} aria-label="Date range" placeholder="Pick a date range" maxDate={dayDate(today)} value={period.from ? { start: dayDate(period.from), end: dayDate(period.to || period.from) } : null} onChange={(v) => setPeriod({ ...period, ...pickedRange(v) })} />
                )}
              </div>
              <div className={s.fbToolbarGroup}>
                <InputBox type="search" size="sm" surface="muted" leftIcon={<Icon name="search-normal" size={16} />} minWidth={240} placeholder="Search comments" aria-label="Search comments" clearable value={query} onChange={(e) => setQuery(e.target.value)} />
                <div className={s.fbSort}>
                  <Dropdown ariaLabel="Sort" label="" width="trigger" leadingIcon={<Icon name="sort" size={16} />} options={SORTS} value={sort} onChange={(v) => setSort(typeof v === "string" ? v : v?.value || "newest")} />
                </div>
              </div>
            </div>
            <div className={s.fbToolbarRow}>
              <Filter groups={FILTER_GROUPS} value={filters} onChange={setFilters} />
              {filtersActive ? (
                <Button variant="ghost" size="sm" onClick={reset}>
                  Reset all
                </Button>
              ) : null}
            </div>
          </div>

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
            <SectionCard title="Average rating over time" subtitle={`${w.label} · per ${unit}${unit === "week" ? " (week starting)" : ""}`} icon={<Icon name="star" size={18} bulk />} iconColor="var(--tesseract-amber-600)" tone="neutral" padding={20} divided={false}>
              {ratingSeries.length ? (
                <LineChart data={ratingSeries} xKey="x" series={[{ key: "avg", label: "Average rating", color: "var(--tesseract-amber-500)" }]} height={220} yMin={1} yMax={5} yTickCount={5} yFormat={(v) => String(v)} curve="linear" markers markerSize={3} area areaOpacity={0.1} showLegend={false} xTickCount={8} emptyText="No responses match these filters" />
              ) : (
                <Empty size="sm" icon="search-normal" title="No responses match" description="Widen the period or clear a filter." />
              )}
            </SectionCard>

            <SectionCard title="Responses by sentiment" subtitle={`${w.label} · per ${unit} · ${SENTIMENT_RULE}`} icon={<Icon name="message-favorite" size={18} bulk />} headerActions={<SentimentInfo side="left" />} tone="neutral" padding={20} divided={false}>
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
              />
            </SectionCard>

            <SectionCard title="Rating distribution" subtitle={`${filtered.length} response${filtered.length === 1 ? "" : "s"}`} icon={<Icon name="star" size={18} bulk />} iconColor="var(--tesseract-amber-600)" tone="neutral" padding={20} divided={false}>
              <BarChart data={[5, 4, 3, 2, 1].map((n) => ({ x: `${n} ★`, count: filtered.filter((f) => f.rating === n).length }))} xKey="x" series={[{ key: "count", label: "Responses", color: "var(--tesseract-amber-500)" }]} horizontal height={200} barRadius={4} barPadding={0.35} valueLabels showLegend={false} showGrid={false} yTickCount={4} valueFormat={(v) => String(v)} emptyText="No responses match these filters" />
            </SectionCard>

            <SectionCard title="Sentiment split" subtitle={`${positivePct ?? 0}% positive · ${SENTIMENT_RULE}`} icon={<Icon name="heart" size={18} bulk />} headerActions={<SentimentInfo side="left" />} tone="neutral" padding={20} divided={false}>
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
              />
            </SectionCard>
          </div>

          <SectionCard title="Responses" subtitle={`${filtered.length} of ${all.length} · ${summary}`} icon={<Icon name="message-text" size={18} bulk />} tone="neutral" padding={20} divided={false}>
            {filtered.length ? (
              <DataTable className={s.fbTable} columns={columns} data={filtered} rowHeight="lg" pageSize={8} pageSizeOptions={[8, 16, 32]} hoverable={false} />
            ) : (
              <Empty size="sm" icon="search-normal" title="No responses match" description="Widen the period or clear a filter." action={<Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>} />
            )}
            <p className={s.hint}>Patients are not identified. The app stores only the rating, the comment and the time it was submitted.</p>
          </SectionCard>
        </>
      )}
    </>
  );
}
