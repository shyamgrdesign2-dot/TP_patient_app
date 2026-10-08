import { Icon } from "./ui";
import s from "./VisitExperience.module.css";
// `compact` is the one-line card form: "Video", or "In clinic (Place)" with
// the place truncated when space runs out.
export default function VisitType({ type, iconOnly = false, compact, place }) {
  const video = type === "Video consultation";
  const label = video ? "Video consultation" : "In clinic";
  const text = compact
    ? video
      ? "Video"
      : place
        ? `In clinic (${place})`
        : "In clinic"
    : label;
  return (
    <span
      className={s.visitType}
      title={compact && !video && place ? `In clinic, ${place}` : label}
      data-compact={compact || undefined}
      data-icon-only={iconOnly || undefined}
      role={iconOnly ? "img" : undefined}
      aria-label={iconOnly ? label : undefined}
    >
      <Icon
        name={video ? "video" : "hospital"}
        corner="rounded"
        family={video ? "video-audio-image" : "building"}
        bulk={!!compact}
        size={16}
      />
      {!iconOnly && (compact ? <span>{text}</span> : label)}
    </span>
  );
}
