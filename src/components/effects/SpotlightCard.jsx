// Adapted from React Bits SpotlightCard by David Haz.
// https://reactbits.dev/components/spotlight-card — see licenses/react-bits.md.
import { useRef } from "react";
import s from "./SpotlightCard.module.css";

export default function SpotlightCard({
  as: Element = "div",
  children,
  className = "",
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
      {children}
    </Element>
  );
}
