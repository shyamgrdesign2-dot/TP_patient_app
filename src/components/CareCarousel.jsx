import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { doctors, dateKey, formatDate, money } from "../services/data";
import { locations } from "../config/brand";
import { Avatar, Button, Icon, IconButton } from "./ui";
import s from "../App.module.css";

function visitMinutes(visit) {
  const [hour, minute, period] = visit.time.split(/[: ]/);
  return (
    ((Number(hour) % 12) + (period === "PM" ? 12 : 0)) * 60 + Number(minute)
  );
}
export default function CareCarousel() {
  const { state, activeMember } = useApp();
  const navigate = useNavigate();
  const track = useRef(null);
  const [active, setActive] = useState(0);
  const upcoming = state.appointments
    .filter(
      (a) =>
        a.memberId === activeMember.id &&
        a.status === "Confirmed" &&
        a.date >= dateKey(),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || visitMinutes(a) - visitMinutes(b),
    )
    .slice(0, 3);
  const latest = state.records
    .filter((r) => r.memberId === activeMember.id && r.new)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const unpaid = state.bills.filter(
    (b) => b.memberId === activeMember.id && b.status === "Unpaid",
  );
  const slides = upcoming.map((visit) => ({
    kind: "visit",
    id: visit.id,
    label: "Upcoming appointment",
    visit,
  }));
  if (!slides.length)
    slides.push({
      kind: "book",
      id: "book",
      label: "Your next step to better health",
    });
  if (latest)
    slides.push({
      kind: "record",
      id: latest.id,
      label: "New health record",
      record: latest,
    });
  if (unpaid.length)
    slides.push({
      kind: "bill",
      id: "bills",
      label: "Your outstanding bills",
      total: unpaid.reduce((sum, b) => sum + b.amount, 0),
      count: unpaid.length,
    });
  if (slides.length < 2)
    slides.push({
      kind: "checkup",
      id: "checkup",
      label: "Preventive health checks",
    });
  function go(index) {
    const next = (index + slides.length) % slides.length;
    const slide = track.current.children[next];
    track.current.scrollTo({
      left: slide.offsetLeft - track.current.children[0].offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  function syncPosition() {
    const children = [...track.current.children];
    const left = track.current.scrollLeft;
    let nearest = 0;
    children.forEach((child, index) => {
      if (
        Math.abs(child.offsetLeft - children[0].offsetLeft - left) <
        Math.abs(children[nearest].offsetLeft - children[0].offsetLeft - left)
      )
        nearest = index;
    });
    setActive(nearest);
  }
  return (
    <section
      className={s.careCarousel}
      aria-label="Your care updates"
      aria-roledescription="carousel"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          go(active + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div className={s.bannerTrack} ref={track} onScroll={syncPosition}>
        {slides.map((slide, index) => {
          const doctor =
            slide.visit && doctors.find((d) => d.id === slide.visit.doctorId);
          return (
            <article
              key={slide.id}
              className={s.careBanner}
              data-kind={slide.kind}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}: ${slide.label}`}
              inert={active !== index}
            >
              {slide.kind === "visit" ? (
                <>
                  <div className={s.bannerTop}>
                    <span>
                      <Icon name="calendar-2" size={16} bulk /> YOUR NEXT VISIT
                    </span>
                    <span className={s.bannerStatus}>
                      <span /> Confirmed
                    </span>
                  </div>
                  <div className={s.bannerDoctor}>
                    <Avatar
                      src={doctor.image}
                      name={doctor.name}
                      size={56}
                      shape="rounded"
                    />
                    <div className={s.grow}>
                      <h2>{doctor.name}</h2>
                      <p>{doctor.specialty}</p>
                    </div>
                  </div>
                  <div className={s.bannerVisitTime}>
                    <Icon name="calendar-2" size={18} bulk />
                    <strong>
                      {slide.visit.date === dateKey()
                        ? "Today"
                        : formatDate(slide.visit.date, { weekday: "short" })}
                    </strong>
                    <span className={s.bannerDivider} />
                    <strong>{slide.visit.time}</strong>
                  </div>
                  <div className={s.bannerBottom}>
                    <span>
                      <Icon name="location" size={14} bulk />
                      {
                        locations.find((l) => l.id === slide.visit.location)
                          .name
                      }
                    </span>
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate(slide.visit.queue ? "/queue" : "/appointments")
                      }
                      rightIcon={<Icon name="chevron-right" size={16} />}
                    >
                      {slide.visit.queue ? "View queue" : "View appointment"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className={s.bannerTop}>
                    <span>
                      <Icon
                        name={
                          slide.kind === "bill"
                            ? "bill"
                            : slide.kind === "record"
                              ? "document-text"
                              : "health"
                        }
                        size={16}
                        bulk
                      />
                      {slide.kind === "record"
                        ? "A NEW UPDATE"
                        : slide.kind === "bill"
                          ? "BILLS & PAYMENTS"
                          : "CARE, MADE SIMPLE"}
                    </span>
                    <Icon name="health" size={24} bulk />
                  </div>
                  <div className={s.bannerMessage}>
                    <h2>
                      {slide.kind === "record"
                        ? "Your report is ready."
                        : slide.kind === "bill"
                          ? `${money(slide.total)} outstanding`
                          : slide.kind === "checkup"
                            ? "Make time for your health."
                            : "Let’s plan your next visit."}
                    </h2>
                    <p>
                      {slide.kind === "record"
                        ? slide.record.title
                        : slide.kind === "bill"
                          ? `${slide.count} unpaid ${slide.count === 1 ? "bill" : "bills"} for ${activeMember.name.split(" ")[0]}`
                          : slide.kind === "checkup"
                            ? "Health checks designed around you."
                            : "Find the right specialist at your hospital."}
                    </p>
                  </div>
                  <div className={s.bannerBottom}>
                    <small>For {activeMember.name.split(" ")[0]}</small>
                    <Button
                      size="sm"
                      rightIcon={<Icon name="chevron-right" size={16} />}
                      onClick={() =>
                        navigate(
                          slide.kind === "record"
                            ? `/records?record=${slide.record.id}`
                            : slide.kind === "bill"
                              ? "/billing"
                              : slide.kind === "checkup"
                                ? "/packages"
                                : "/doctors",
                        )
                      }
                    >
                      {slide.kind === "record"
                        ? "View report"
                        : slide.kind === "bill"
                          ? "View bills"
                          : slide.kind === "checkup"
                            ? "Explore packages"
                            : "Find a doctor"}
                    </Button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
      <div className={s.carouselControls}>
        <div className={s.bannerDots}>
          {slides.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              aria-label={`Show banner ${index + 1}: ${slide.label}`}
              aria-pressed={active === index}
              onClick={() => go(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <span className={s.bannerCounter} aria-live="polite">
          {active + 1} of {slides.length}
        </span>
        <div className={s.bannerArrows}>
          <IconButton
            name="chevron-right"
            label="Next care update"
            onClick={() => go(active + 1)}
          />
        </div>
      </div>
    </section>
  );
}
