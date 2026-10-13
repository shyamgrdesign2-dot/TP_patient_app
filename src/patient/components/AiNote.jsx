import { Icon } from "./ui";
import s from "./AiNote.module.css";

export function AiSpark({ size = 20, monochrome = false }) {
  return (
    <span
      aria-hidden="true"
      className={s.spark}
      data-monochrome={monochrome || undefined}
      style={{
        width: size,
        height: size,
        ...(monochrome ? { background: "currentColor" } : {}),
      }}
    />
  );
}

// An attached provenance strip. Edits are labelled only when the record
// explicitly carries edit metadata; analysis never implies a clinician edit.
export default function AiNote({
  edit,
  compact = false,
  title = "AI summary",
  children,
  onClick,
}) {
  const Element = onClick ? "button" : "div";
  return (
    <Element
      className={s.note}
      {...(onClick ? { type: "button", onClick } : {})}
    >
      <AiSpark />
      <span className={s.copy}>
        <strong>{edit ? "AI-assisted edit" : title}</strong>
        {!compact && (
          <small>
            {edit?.description ||
              children ||
              "An explanation of this record. Original document unchanged."}
          </small>
        )}
        {edit && (
          <small>
            {edit.reviewedBy
              ? `Reviewed by ${edit.reviewedBy}`
              : "Awaiting clinician review"}
          </small>
        )}
      </span>
      {onClick && <Icon name="chevron-right" size={16} />}
    </Element>
  );
}
