import { useEffect, useState } from "react";
import { useApp } from "../state/AppContext";
import { BrandMark } from "./ui";
import s from "../App.module.css";

const SHOWN = "tatva-splash-shown";
const HOLD_MS = 1200;
const FADE_MS = 320;

// Automated browsers (Playwright) never see the splash, so tests stay fast.
function firstOpen() {
  try {
    return !navigator.webdriver && !sessionStorage.getItem(SHOWN);
  } catch {
    return false;
  }
}

// Cold-start splash: the hospital mark and name, once per browser session.
export default function Splash() {
  const { brand } = useApp();
  const [phase, setPhase] = useState(() => (firstOpen() ? "in" : "done"));
  useEffect(() => {
    if (phase === "done") return;
    try {
      sessionStorage.setItem(SHOWN, "1");
    } catch {
      /* shown again next load; harmless */
    }
    const timer = setTimeout(
      () => (phase === "in" ? setPhase("out") : setPhase("done")),
      phase === "in" ? HOLD_MS : FADE_MS,
    );
    return () => clearTimeout(timer);
  }, [phase]);
  if (phase === "done") return null;
  return (
    <div
      className={s.splash}
      data-phase={phase}
      aria-hidden="true"
      data-testid="splash"
      onClick={() => setPhase("out")}
    >
      <BrandMark size={88} className={s.splashMark} />
      <strong>{brand.hospitalName}</strong>
    </div>
  );
}
