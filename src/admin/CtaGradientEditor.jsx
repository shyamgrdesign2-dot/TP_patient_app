import { useId } from "react";
import { normalizeCtaGradient } from "../shared/brandGradient";
import { ctaPresentation } from "../shared/brandCta";
import { whiteTextContrast } from "../shared/brand";
import s from "./CtaGradientEditor.module.css";

export default function CtaGradientEditor({ form, onChange }) {
  const id = useId();
  const gradient = normalizeCtaGradient(form.ctaGradient);
  const colors = gradient
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
    : [form.primary || "#4b4ad5", form.accent || "#673aac"];
  const presentation = ctaPresentation(gradient, form.primary);
  const setGradient = (start, end) =>
    onChange({
      ...form,
      primary: start,
      ctaGradient: `linear-gradient(110deg, ${start}, ${end})`,
    });
  return (
    <section className={s.section} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Primary colour</h3>
      <p>
        Your exact brand colour is used for solid and gradient surfaces. Text
        adjusts automatically for contrast.
      </p>
      <div
        className={s.styleChoice}
        role="radiogroup"
        aria-label="Primary colour style"
      >
        {["Solid", "Gradient"].map((style) => (
          <button
            key={style}
            type="button"
            role="radio"
            aria-checked={style === (gradient ? "Gradient" : "Solid")}
            onClick={() =>
              style === "Solid"
                ? onChange({ ...form, ctaGradient: "" })
                : setGradient(colors[0], colors.at(-1))
            }
          >
            {style}
          </button>
        ))}
      </div>
      {!gradient ? (
        <label className={s.field}>
          Primary colour
          <span className={s.colorControl}>
            <input
              type="color"
              aria-label="Primary colour picker"
              value={
                /^#[\da-f]{6}$/i.test(form.primary) ? form.primary : "#ffffff"
              }
              onChange={(e) => onChange({ ...form, primary: e.target.value })}
            />
            <input
              type="text"
              aria-label="Primary colour hex"
              placeholder="#4B4AD5"
              maxLength={7}
              value={form.primary}
              onChange={(e) =>
                onChange({
                  ...form,
                  primary: e.target.value.startsWith("#")
                    ? e.target.value
                    : `#${e.target.value}`,
                })
              }
            />
          </span>
        </label>
      ) : (
        <>
          <div className={s.colors}>
            {[
              ["Start colour", colors[0]],
              ["End colour", colors.at(-1)],
            ].map(([label, color], i) => (
              <label key={label}>
                {label}
                <span className={s.colorControl}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) =>
                      setGradient(
                        i === 0 ? e.target.value : colors[0],
                        i === 1 ? e.target.value : colors.at(-1),
                      )
                    }
                  />
                  <code>{color.toUpperCase()}</code>
                </span>
              </label>
            ))}
          </div>
          <div
            className={s.preview}
            style={{
              backgroundImage: presentation.background,
              color: presentation.textColor,
            }}
          >
            <span
              style={{
                background: presentation.labelBackground,
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              Your primary gradient
            </span>
          </div>
        </>
      )}
      <label className={s.field}>
        Heading colour <small>Optional</small>
        <span className={s.colorControl}>
          <input
            type="color"
            aria-label="Heading colour picker"
            value={form.textHeading || "#171725"}
            onChange={(e) => onChange({ ...form, textHeading: e.target.value })}
          />
          <span>
            {form.textHeading?.toUpperCase() || "Default text colour"}
          </span>
        </span>
      </label>
      {form.textHeading && whiteTextContrast(form.textHeading) < 4.5 && (
        <small role="status">
          This shade is too light on white. A readable default is used.
        </small>
      )}
    </section>
  );
}
