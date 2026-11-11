import { useApp } from "../patient/state/AppContext";
import { dateKey } from "../shared/data";
import { Icon } from "../shared/ui";
import { Bars, PageTitle } from "./AdminParts";
import s from "./Admin.module.css";

const timeAgo = (iso) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
};
const when = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

function Stars({ value, size = 14, label }) {
  return (
    <span className={s.stars} role="img" aria-label={label || `${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} bulk={value >= n} />
      ))}
    </span>
  );
}

export const averageRating = (feedback) =>
  feedback.length
    ? (feedback.reduce((n, f) => n + (f.rating || 0), 0) / feedback.length).toFixed(1)
    : null;

export const ratingRows = (feedback) =>
  [5, 4, 3, 2, 1].map((n) => [
    `${n} star${n === 1 ? "" : "s"}`,
    feedback.filter((f) => f.rating === n).length,
    n >= 4 ? "brand" : n === 3 ? "soft" : "neutral",
  ]);

// Summary plus the most recent comments. Used inside the Overview card and on
// the Patient feedback page (which shows the full list).
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
            {avg} <small>of 5</small>
          </strong>
          <Stars value={Math.round(Number(avg))} size={16} label={`Average rating ${avg} out of 5`} />
          <small>Average rating</small>
        </div>
        <Bars label="Responses by rating" rows={ratingRows(feedback)} />
      </div>
      <ul className={s.feedbackList} aria-label="Recent feedback">
        {feedback.slice(0, limit).map((f) => (
          <li key={f.id}>
            <div className={s.feedbackMeta}>
              <Stars value={f.rating} />
              <small title={when(f.createdAt)}>{timeAgo(f.createdAt)}</small>
            </div>
            <p>{f.message?.trim() ? f.message : <em>Rating only, no comment</em>}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Patient feedback: everything patients submit from Account → Feedback in the
// app. Read-only for the hospital; the demo reads the same local state the
// patient app writes. In production this comes from the tenant-scoped
// feedback service (see docs/DEVELOPER_HANDOFF.md, "Support and feedback").
export default function Feedback() {
  const { state } = useApp();
  const feedback = state.feedback || [];
  const month = dateKey().slice(0, 7);
  const thisMonth = feedback.filter((f) => f.createdAt?.startsWith(month)).length;
  const withComment = feedback.filter((f) => f.message?.trim()).length;
  const avg = averageRating(feedback);
  return (
    <>
      <PageTitle
        title="Patient feedback"
        sub="Ratings and comments patients share from Account → Feedback in the app. Newest first."
      />
      <div className={s.stats}>
        {[
          ["Average rating", avg ? `${avg} / 5` : "—", "star"],
          ["Responses", feedback.length, "message-favorite"],
          ["This month", thisMonth, "calendar-2"],
          ["With a comment", withComment, "message-text"],
        ].map(([label, value, icon]) => (
          <div className={s.stat} key={label}>
            <span className={s.statIcon}>
              <Icon name={icon} size={20} bulk />
            </span>
            <strong>{value}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <section className={s.chartCard} data-wide>
        <header>
          <h2>All feedback</h2>
          <small>
            {feedback.length
              ? `${feedback.length} response${feedback.length === 1 ? "" : "s"} · patients are not identified; the app collects the rating and comment only`
              : "Nothing submitted yet"}
          </small>
        </header>
        <FeedbackPanel feedback={feedback} limit={Infinity} />
      </section>
    </>
  );
}
