import { useId } from "react";
import { normalizeCtaGradient } from "../shared/brandGradient";
import { ctaPresentation } from "../shared/brandCta";
import { whiteTextContrast } from "../shared/brand";
import s from "./CtaGradientEditor.module.css";

function ColorControl({ label, value, onChange, fallback = "#171725", hint }) {
  const id = useId();
  const valid = /^#[\da-f]{6}$/i.test(value);
  return (
    <div className={s.field}>
      <label htmlFor={id}>{label}</label>
      <div className={s.colorControl}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          id={id}
          type="text"
          aria-label={`${label} hex`}
          value={value}
          placeholder={fallback.toUpperCase()}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!!value && !valid}
          onChange={(e) =>
            onChange(
              e.target.value.startsWith("#") || !e.target.value
                ? e.target.value
                : `#${e.target.value}`,
            )
          }
        />
      </div>
      {hint && <small>{hint}</small>}
      {!!value && !valid && (
        <small role="alert">
          Enter a six-digit colour code, such as #4B4AD5.
        </small>
      )}
    </div>
  );
}

export default function CtaGradientEditor({ form, onChange }) {
  const patch = (values) => onChange({ ...form, ...values });
  const gradient = normalizeCtaGradient(form.ctaGradient);
  const fill = form.ctaColor || form.primary;
  const presentation = ctaPresentation(gradient, fill, form.ctaTextColor);
  const stops = gradient
    ? [...gradient.matchAll(/#[\da-f]{6}|rgba?\([^)]+\)/gi)].map(([color]) =>
        color.startsWith("#")
          ? color
          : "#" +
            color
              .match(/[\d.]+/g)
              .slice(0, 3)
              .map((v) => Math.round(Number(v)).toString(16).padStart(2, "0"))
              .join(""),
      )
    : [fill, fill];
  const setGradient = (first, last) =>
    patch({ ctaGradient: `linear-gradient(110deg, ${first}, ${last})` });
  return (
    <div className={s.section}>
      <section className={s.group} aria-label="Primary colour">
        <h4>Primary colour</h4>
        <p>Your exact brand colour for app accents and surfaces.</p>
        <ColorControl
          label="Primary colour"
          value={form.primary}
          fallback="#4b4ad5"
          onChange={(primary) => patch({ primary })}
        />
      </section>
      <section className={s.group} aria-label="Text colours">
        <h4>Text colours</h4>
        <p>Set colours for primary headings and body text.</p>
        <div className={s.colors}>
          <ColorControl
            label="Primary heading colour"
            value={form.textHeading || ""}
            hint="Leave blank to use the default heading colour."
            onChange={(textHeading) => patch({ textHeading })}
          />
          <ColorControl
            label="Body text colour"
            value={form.textBody || ""}
            fallback="#52525f"
            hint="Leave blank to use the default body colour."
            onChange={(textBody) => patch({ textBody })}
          />
        </div>
        {[form.textHeading, form.textBody].some(
          (v) => v && whiteTextContrast(v) < 4.5,
        ) && (
          <small role="status">
            A text colour is too light on white. A readable default is used.
          </small>
        )}
      </section>
      <section className={s.group} aria-label="CTA styling">
        <h4>CTA</h4>
        <p>Choose the button background and the text placed on it.</p>
        <div
          className={s.styleChoice}
          role="radiogroup"
          aria-label="CTA background style"
        >
          {["Solid", "Gradient"].map((style) => (
            <button
              key={style}
              type="button"
              role="radio"
              aria-checked={style === (gradient ? "Gradient" : "Solid")}
              onClick={() =>
                style === "Solid"
                  ? patch({ ctaGradient: "" })
                  : setGradient(stops[0], stops.at(-1))
              }
            >
              {style}
            </button>
          ))}
        </div>
        <div className={s.colors}>
          {gradient ? (
            <>
              <ColorControl
                label="Start colour"
                value={stops[0]}
                onChange={(v) => setGradient(v, stops.at(-1))}
              />
              <ColorControl
                label="End colour"
                value={stops.at(-1)}
                onChange={(v) => setGradient(stops[0], v)}
              />
            </>
          ) : (
            <ColorControl
              label="CTA background colour"
              value={form.ctaColor || ""}
              fallback={form.primary}
              hint="Leave blank to use your primary colour."
              onChange={(ctaColor) => patch({ ctaColor })}
            />
          )}
          <ColorControl
            label="CTA text colour"
            value={form.ctaTextColor || presentation.textColor}
            fallback={presentation.textColor}
            hint="White by default. Pick another colour to change it."
            onChange={(ctaTextColor) => patch({ ctaTextColor })}
          />
        </div>
        <div className={s.preview} aria-label="CTA preview">
          <small>Button preview</small>
          <div
            className={s.ctaSample}
            style={{
              background: gradient || fill,
              color: presentation.textColor,
            }}
          >
            <span style={{ background: presentation.labelBackground }}>
              Continue →
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
