// Adapted from React Bits SpotlightCard by David Haz.
// https://reactbits.dev/components/spotlight-card — see licenses/react-bits.md.
import { useRef } from "react";
import { AnimatedGrid } from "@dhspl-tatvacare/tesseract-ui";
import CardPattern from "./CardPattern";
import s from "./SpotlightCard.module.css";

export default function SpotlightCard({
  as: Element = "div",
  children,
  className = "",
  pattern = "lattice",
  ...props
}) {
  const card = useRef(null);
  function move(event) {
    if (
      event.pointerType === "touch" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const rect = card.current.getBoundingClientRect();
    card.current.style.setProperty(
      "--tesseract-spotlight-x",
      `${event.clientX - rect.left}px`,
    );
    card.current.style.setProperty(
      "--tesseract-spotlight-y",
      `${event.clientY - rect.top}px`,
    );
  }
  return (
    <Element
      {...props}
      ref={card}
      onPointerMove={move}
      className={`${s.spotlight} ${className}`}
    >
      <div className={s.pattern} data-pattern={pattern} aria-hidden="true">
        {pattern !== "lattice" ? (
          <CardPattern kind={pattern} />
        ) : (
          <AnimatedGrid
            className={s.lattice}
            animated={false}
            lineColor="var(--tesseract-grid-color, color-mix(in srgb, var(--tesseract-blue-300) 24%, transparent))"
            edgeFade={false}
          />
        )}
      </div>
      {children}
    </Element>
  );
}
