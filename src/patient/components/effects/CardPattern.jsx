import { AnimatedGrid } from "@dhspl-tatvacare/tesseract-ui";

// Tesseract HeroBanner lattice (same component, colour and fade), widened
// and nudged left so it stays visible on the narrower phone cards.
const LATTICE = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  width: "52%",
  right: "-4%",
  height: "250%",
  pointerEvents: "none",
  mixBlendMode: "screen",
  WebkitMaskImage:
    "linear-gradient(to left, black 0%, black 26%, transparent 92%)",
  maskImage: "linear-gradient(to left, black 0%, black 26%, transparent 92%)",
};

export default function CardPattern() {
  return (
    <AnimatedGrid
      lineColor="color-mix(in srgb, var(--tesseract-slate-0) 28%, transparent)"
      style={LATTICE}
    />
  );
}
