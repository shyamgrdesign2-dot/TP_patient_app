import { AnimatedGrid } from "@dhspl-tatvacare/tesseract-ui";
import s from "./BrandHeader.module.css";

export default function BrandHeaderPattern({ corners = false }) {
  return (
    <span className={s.pattern} aria-hidden="true">
      {(corners
        ? [s.topLeft, s.topRight, s.bottomLeft, s.bottomRight]
        : [s.gridLeft, s.gridRight]
      ).map((side) => (
        <AnimatedGrid
          key={side}
          className={`${s.grid} ${side}`}
          lineColor="color-mix(in srgb, var(--brand-on-banner, white) 18%, transparent)"
          cometColor="color-mix(in srgb, var(--brand-on-banner, white) 55%, transparent)"
          edgeFade={0.4}
          speed="slow"
          density={0.2}
        />
      ))}
    </span>
  );
}
