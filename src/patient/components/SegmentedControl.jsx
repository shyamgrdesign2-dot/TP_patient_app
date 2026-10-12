import { useEffect, useRef } from "react";
import { SegmentedControl as TesseractSegmentedControl } from "@dhspl-tatvacare/tesseract-ui";
import s from "./SegmentedControl.module.css";

// Keep Tesseract's values and appearance with resilient sizing and radio keys.
export default function SegmentedControl({ className = "", value, ...props }) {
  const root = useRef(null);
  useEffect(() => {
    root.current?.querySelectorAll('[role="radio"]').forEach((radio) => {
      radio.tabIndex = radio.getAttribute("aria-checked") === "true" ? 0 : -1;
    });
  }, [value]);
  function onKeyDown(event) {
    const keys = [
      "ArrowRight",
      "ArrowLeft",
      "ArrowDown",
      "ArrowUp",
      "Home",
      "End",
    ];
    if (!keys.includes(event.key)) return;
    const radios = [
      ...root.current.querySelectorAll('[role="radio"]:not(:disabled)'),
    ];
    const index = radios.indexOf(event.target.closest('[role="radio"]'));
    if (index < 0 || !radios.length) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? radios.length - 1
          : (index +
              (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) +
              radios.length) %
            radios.length;
    radios[next].focus();
    radios[next].click();
  }
  return (
    <TesseractSegmentedControl
      {...props}
      value={value}
      ref={root}
      className={`${s.control} ${className}`}
      onKeyDown={onKeyDown}
    />
  );
}
