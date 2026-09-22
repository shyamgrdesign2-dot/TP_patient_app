import { Icon } from "./ui";
import s from "./VisitExperience.module.css";
export default function VisitType({ type, iconOnly = false }) {
  const video = type === "Video consultation";
  const label = video ? "Video consultation" : "In clinic";
  return (
    <span
      className={s.visitType}
      title={label}
      role={iconOnly ? "img" : undefined}
      aria-label={iconOnly ? label : undefined}
    >
      <Icon
        name={video ? "video" : "hospital"}
        corner="rounded"
        family={video ? "video-audio-image" : "building"}
        bulk
        size={16}
      />
      {!iconOnly && label}
    </span>
  );
}
