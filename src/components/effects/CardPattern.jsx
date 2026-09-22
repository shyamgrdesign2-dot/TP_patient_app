import { AnimatedGrid } from "@dhspl-tatvacare/tesseract-ui";
import s from "./SpotlightCard.module.css";
export default function CardPattern({ kind }) {
  const photograph =
    kind === "records"
      ? "/images/laboratory-generated.png"
      : ["appointments", "completed"].includes(kind)
        ? "/images/clinic-waiting-generated.png"
        : null;
  return (
    <>
      {photograph && <img className={s.scene} src={photograph} alt="" />}
      <AnimatedGrid
        className={s.zoomGrid}
        animated={false}
        edgeFade={false}
        lineColor="currentColor"
      />
    </>
  );
}
