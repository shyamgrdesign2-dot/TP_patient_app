import { useCallback, useEffect, useRef, useState } from "react";
import { dateKey } from "../../shared/data";
import { Icon, Sheet } from "./ui";
import s from "./DatePicker.module.css";

// Bookable window: tomorrow through the next 90 days.
const FIRST = 1;
const LAST = 90;
const WEEK = 7;
const DAY = 86400000;
const noon = (key) => new Date(`${key}T12:00:00`);
const offsetOf = (key) => Math.round((noon(key) - noon(dateKey())) / DAY);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
// Index of the first day of the snapped week that contains this day.
const weekIndex = (key) =>
  Math.floor(clamp(offsetOf(key) - FIRST, 0, LAST - FIRST) / WEEK) * WEEK;
const label = (key, options) => noon(key).toLocaleDateString("en-IN", options);

// A swipeable strip of every bookable day that snaps a week at a time, with
// the visible month opening a full calendar sheet.
export default function DatePicker({ value, onChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const strip = useRef(null);
  const days = Array.from({ length: LAST - FIRST + 1 }, (_, i) =>
    dateKey(FIRST + i),
  );
  const [first, setFirst] = useState(() => weekIndex(value));
  const visibleMonth = label(days[Math.min(first + 3, days.length - 1)], {
    month: "long",
    year: "numeric",
  });
  // Bring a day's week into view (on mount and after a calendar pick).
  const reveal = useCallback((key, smooth) => {
    const node = strip.current;
    if (!node) return;
    const index = weekIndex(key);
    const cell = node.children[index];
    if (cell)
      node.scrollTo({
        left: cell.offsetLeft - node.offsetLeft,
        behavior: smooth ? "smooth" : "auto",
      });
  }, []);
  useEffect(() => reveal(value, false), [reveal]);
  function onScroll() {
    const node = strip.current;
    const cell = node.children[0];
    if (!cell) return;
    const step = cell.getBoundingClientRect().width + 4;
    setFirst(Math.round(node.scrollLeft / step));
  }
  return (
    <div className={s.picker}>
      <div className={s.header}>
        <button
          className={s.monthButton}
          aria-label={`${visibleMonth}. Open calendar`}
          aria-haspopup="dialog"
          onClick={() => setCalendarOpen(true)}
        >
          <Icon name="calendar-2" size={18} bulk={false} />
          {visibleMonth}
          <Icon name="chevron-down" size={16} />
        </button>
      </div>
      <div
        className={s.days}
        ref={strip}
        onScroll={onScroll}
        role="group"
        aria-label="Choose a day. Swipe for more weeks."
      >
        {days.map((d) => (
          <button
            key={d}
            data-selected={value === d}
            aria-pressed={value === d}
            aria-label={label(d, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            onClick={() => onChange(d)}
          >
            <small>{label(d, { weekday: "short" })}</small>
            <strong>{noon(d).getDate()}</strong>
          </button>
        ))}
      </div>
      <CalendarSheet
        open={calendarOpen}
        value={value}
        onClose={() => setCalendarOpen(false)}
        onPick={(key) => {
          onChange(key);
          setCalendarOpen(false);
          reveal(key, true);
        }}
      />
    </div>
  );
}

function CalendarSheet({ open, value, onClose, onPick }) {
  const first = noon(value);
  const [month, setMonth] = useState(
    () => new Date(first.getFullYear(), first.getMonth(), 1, 12),
  );
  const minMonth = new Date(noon(dateKey(FIRST)).setDate(1));
  const maxMonth = new Date(noon(dateKey(LAST)).setDate(1));
  // Monday-first grid with leading blanks.
  const lead = (month.getDay() + 6) % 7;
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => {
      const d = new Date(month.getFullYear(), month.getMonth(), i + 1, 12);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }),
  ];
  const shift = (n) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1, 12));
  return (
    <Sheet open={open} onClose={onClose} title="Pick a date">
      <div className={s.calendar}>
        <div className={s.monthNav}>
          <button
            className={s.page}
            aria-label="Previous month"
            disabled={month <= minMonth}
            onClick={() => shift(-1)}
          >
            <Icon name="chevron-left" size={18} />
          </button>
          <strong aria-live="polite">
            {month.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            className={s.page}
            aria-label="Next month"
            disabled={month >= maxMonth}
            onClick={() => shift(1)}
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
        <div className={s.grid} role="grid">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <span key={d} className={s.weekday} aria-hidden="true">
              {d}
            </span>
          ))}
          {cells.map((key, i) => {
            if (!key) return <span key={`blank-${i}`} />;
            const offset = offsetOf(key);
            const disabled = offset < FIRST || offset > LAST;
            return (
              <button
                key={key}
                className={s.cell}
                data-selected={key === value}
                data-today={offset === 0}
                disabled={disabled}
                aria-pressed={key === value}
                aria-label={label(key, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                onClick={() => onPick(key)}
              >
                {noon(key).getDate()}
              </button>
            );
          })}
        </div>
        <p className={s.hint}>
          Appointments can be booked up to {LAST} days ahead.
        </p>
      </div>
    </Sheet>
  );
}
