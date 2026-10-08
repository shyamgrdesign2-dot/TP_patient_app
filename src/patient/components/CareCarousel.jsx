import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { selectCareUpdates } from "../services/careUpdates";
import { Avatar, Button, Icon, AbhaLogo } from "./ui";
import SpotlightCard from "./effects/SpotlightCard";
import VisitType from "./VisitType";
import v from "./VisitExperience.module.css";
import shared from "../App.module.css";
import s from "../Home.module.css";

// Bulk icon before each banner's heading; appointments show the visit type.
function labelIcon(slide) {
  if (slide.category.id === "appointments")
    return slide.visitType === "Video consultation"
      ? { name: "video", family: "video-audio-image" }
      : { name: "hospital", family: "building" };
  if (slide.category.id === "records")
    return { name: "document-text", family: "content-edit" };
  return { name: "health", family: "essential" };
}
export default function CareCarousel() {
  const { state, activeMember } = useApp();
  const slides = selectCareUpdates(state, activeMember.id);
  return (
    <>
      <h1 className={shared.srOnly}>Your care home</h1>
      {slides.length > 0 && (
        <CareBanners
          key={`${activeMember.id}-${slides.map((slide) => slide.id).join("-")}`}
          slides={slides}
        />
      )}
    </>
  );
}
function CareBanners({ slides }) {
  const { openAgent } = useApp();
  const navigate = useNavigate();
  const track = useRef(null);
  const count = slides.length;
  const start = count > 1 ? count : 0;
  const [position, setPosition] = useState(start);
  const physical = useRef(start);
  const active = position % count;
  const timer = useRef(null);
  const repeated = count > 1 ? [...slides, ...slides, ...slides] : slides;
  function center(index, behavior = "instant") {
    const node = track.current;
    const slide = node?.children[index];
    if (!slide) return;
    node.scrollTo({
      top: 0,
      left: slide.offsetLeft + slide.offsetWidth / 2 - node.clientWidth / 2,
      behavior,
    });
  }
  useLayoutEffect(() => {
    const node = track.current;
    const observer = new ResizeObserver(() => center(physical.current));
    observer.observe(node);
    center(start);
    return () => {
      observer.disconnect();
      clearTimeout(timer.current);
    };
  }, [start]);
  function go(index) {
    const delta = index - active;
    center(
      physical.current + delta,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    );
  }
  function syncPosition() {
    const node = track.current;
    const children = [...node.children];
    const middle = node.scrollLeft + node.clientWidth / 2;
    const nearest = children.reduce(
      (best, child, index) =>
        Math.abs(child.offsetLeft + child.offsetWidth / 2 - middle) <
        Math.abs(
          children[best].offsetLeft + children[best].offsetWidth / 2 - middle,
        )
          ? index
          : best,
      0,
    );
    physical.current = nearest;
    setPosition(nearest);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (
        count > 1 &&
        (physical.current < count || physical.current >= count * 2)
      ) {
        const rebased = count + (physical.current % count);
        physical.current = rebased;
        setPosition(rebased);
        center(rebased);
      }
    }, 180);
  }
  return (
    <section
      className={s.careCarousel}
      aria-label="Your care updates"
      aria-roledescription={count > 1 ? "carousel" : undefined}
      data-single={count === 1}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          go(active + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div className={s.bannerTrack} ref={track} onScroll={syncPosition}>
        {repeated.map((slide, index) => (
          <SpotlightCard
            as="article"
            key={`${slide.id}-${index}`}
            className={s.careBanner}
            pattern={slide.id}
            data-category={slide.id}
            data-tone={slide.tone}
            onClick={(event) => {
              if (!event.target.closest("button")) {
                if (slide.action.path.startsWith("/assistant?appointment="))
                  openAgent({
                    kind: "symptoms",
                    appointmentId: slide.entityId,
                  });
                else navigate(slide.action.path);
              }
            }}
            data-state={slide.state}
            data-side={
              index === position
                ? "center"
                : index < position
                  ? "left"
                  : "right"
            }
            role="group"
            aria-roledescription="slide"
            aria-label={`${(index % count) + 1} of ${count}: ${slide.label}`}
            aria-hidden={position !== index}
            inert={position !== index}
          >
            <div className={s.bannerTop}>
              <span className={s.categoryLabel}>
                {slide.category.id === "abha" ? (
                  <span className={s.abhaMark} aria-hidden="true" />
                ) : (
                  <Icon {...labelIcon(slide)} corner="rounded" size={16} bulk />
                )}
                {slide.categoryLabel || slide.category.label}
              </span>
              <span
                className={s.bannerStatus}
                data-state={slide.state}
                data-side={
                  index === position
                    ? "center"
                    : index < position
                      ? "left"
                      : "right"
                }
              >
                {["upcoming", "completed"].includes(slide.state) && (
                  <Icon name="tick-circle" size={12} />
                )}
                {slide.status}
              </span>
            </div>
            <div className={s.bannerContent}>
              {slide.id === "abha" && (
                <span className={s.bannerIdentity}>
                  <AbhaLogo />
                </span>
              )}
              {["upcoming", "completed"].includes(slide.state) && (
                <Avatar
                  src={slide.image}
                  name={slide.title}
                  size={44}
                  shape="rounded"
                />
              )}
              <div className={shared.grow}>
                <h2>{slide.title}</h2>
                <p>{slide.description}</p>
              </div>
            </div>
            <div
              className={s.bannerBottom}
              data-single={!slide.detail || undefined}
            >
              {slide.detail && (
                <div className={s.bannerSchedule}>
                  <strong title={slide.detail}>{slide.detail}</strong>
                  {slide.meta && (
                    <span title={slide.meta}>
                      {["upcoming", "completed"].includes(slide.state) && (
                        <Icon name="location" size={13} bulk />
                      )}
                      {slide.meta}
                    </span>
                  )}
                </div>
              )}
              <Button
                data-ai={slide.action.path.startsWith("/assistant?")}
                leftIcon={
                  slide.action.path.startsWith("/assistant?") ? (
                    <Icon name="add-plain" size={14} />
                  ) : undefined
                }
                className={
                  slide.action.path.startsWith("/assistant?")
                    ? v.aiAction
                    : undefined
                }
                size="sm"
                onClick={() =>
                  slide.action.path.startsWith("/assistant?appointment=")
                    ? openAgent({
                        kind: "symptoms",
                        appointmentId: slide.entityId,
                      })
                    : navigate(slide.action.path)
                }
                rightIcon={
                  slide.action.path.startsWith("/assistant?") ? undefined : (
                    <Icon name="chevron-right" size={14} />
                  )
                }
              >
                {slide.action.label}
              </Button>
            </div>
          </SpotlightCard>
        ))}
      </div>
      {count > 1 && (
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
          <span className={shared.srOnly} aria-live="polite">
            {slides[active].category.label}, {active + 1} of {slides.length}
          </span>
        </div>
      )}
    </section>
  );
}
