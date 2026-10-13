import { useEffect, useRef, useState } from "react";
import { Button } from "../patient/components/ui";
import { AiSpark } from "../patient/components/AiNote";
import s from "./BrandWebsiteImport.module.css";
import { fontStack, googleFonts } from "../shared/brand";

const availableFonts = new Set(googleFonts.map(([name]) => name));

const expectedFields = [
  ["hospitalName", "Hospital name"],
  ["logoMark", "App icon"],
  ["logo", "Horizontal logo"],
  ["primary", "Primary colour"],
  ["textHeading", "Primary heading colour"],
  ["textBody", "Body text colour"],
  ["fontHeading", "Heading font"],
  ["fontBody", "Body font"],
];
export default function BrandWebsiteImport({
  onApply,
  onUploadMissing,
  colours,
  onPreviewColours,
}) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState([]);
  const [verifiedLogos, setVerifiedLogos] = useState([]);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const request = useRef(null);
  const originalColours = useRef({});
  const previewColours = useRef(onPreviewColours);
  useEffect(() => {
    previewColours.current = onPreviewColours;
  }, [onPreviewColours]);
  useEffect(() => {
    if (!result || !previewColours.current) return;
    const patch = { ...originalColours.current };
    if (selected.includes("primary")) {
      patch.ctaColor = "";
      patch.ctaGradient = "";
      patch.ctaTextColor = "";
    }
    for (const candidate of result.candidates) {
      if (
        [
          "primary",
          "accent",
          "textHeading",
          "textBody",
          "ctaGradient",
          "ctaColor",
          "ctaTextColor",
        ].includes(candidate.key) &&
        selected.includes(candidate.key)
      ) {
        patch[candidate.key] = candidate.value;
        if (candidate.key === "ctaColor") patch.ctaGradient = "";
      }
    }
    const selectedGradient = result.candidates.find(
      (c) => c.key === "ctaGradient" && selected.includes(c.key),
    );
    if (selectedGradient) patch.ctaGradient = selectedGradient.value;
    previewColours.current(patch);
  }, [result, selected]);
  useEffect(() => () => request.current?.abort(), []);
  async function analyze(event) {
    event.preventDefault();
    if (busy) return;
    let website = url.trim();
    if (!/^https?:\/\//i.test(website)) website = "https://" + website;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    originalColours.current = Object.fromEntries(
      [
        "primary",
        "accent",
        "textHeading",
        "textBody",
        "ctaGradient",
        "ctaColor",
        "ctaTextColor",
      ].map((key) => [key, colours?.[key] || ""]),
    );
    setBusy(true);
    setResult(null);
    setVerifiedLogos([]);
    setError("");
    setApplied(false);
    try {
      const response = await fetch("/api/brand-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
        signal: controller.signal,
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "Website import is unavailable on this host. You can still enter brand details manually.",
        );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not analyze this website.");
      const supported = new Set(expectedFields.map(([key]) => key));
      const candidates = data.candidates
        .filter(
          (c) =>
            supported.has(c.key) &&
            (!c.key.startsWith("font") || availableFonts.has(c.value)),
        )
        .map((c) =>
          c.key === "ctaGradient"
            ? { ...c, label: "CTA background gradient" }
            : c,
        );
      setResult({ ...data, candidates });
      setSelected(
        candidates
          .filter(
            (c) =>
              ![
                "logo",
                "logoMark",
                "ctaColor",
                "ctaTextColor",
                "ctaGradient",
              ].includes(c.key),
          )
          .map((c) => c.key),
      );
    } catch (issue) {
      if (issue.name !== "AbortError") setError(issue.message);
    } finally {
      if (request.current === controller) setBusy(false);
    }
  }
  function rejectLogo(candidate) {
    setSelected((current) => current.filter((key) => key !== candidate.key));
    setResult(
      (current) =>
        current && {
          ...current,
          candidates: current.candidates.filter(
            (c) => c.key !== candidate.key || c.value !== candidate.value,
          ),
          missingLogos: {
            ...current.missingLogos,
            [candidate.key]:
              "The detected image could not be displayed clearly on white.",
          },
        },
    );
  }
  function verifyLogo(event, candidate) {
    const img = event.currentTarget;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = Math.max(
        1,
        Math.round((240 * img.naturalHeight) / img.naturalWidth),
      );
      if (!img.naturalWidth || canvas.height > 1024)
        return rejectLogo(candidate);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      let visible = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 230) visible++;
      if (visible < 8) return rejectLogo(candidate);
      setVerifiedLogos((current) =>
        current.includes(candidate.key) ? current : [...current, candidate.key],
      );
      setSelected((current) =>
        current.includes(candidate.key) ? current : [...current, candidate.key],
      );
    } catch {
      rejectLogo(candidate);
    }
  }
  function apply() {
    const patch = Object.fromEntries(
      result.candidates
        .filter((c) => selected.includes(c.key))
        .map((c) => [
          c.key,
          c.key.startsWith("font") ? fontStack(c.value) : c.value,
        ]),
    );
    if (selected.includes("primary")) {
      if (!selected.includes("ctaColor")) patch.ctaColor = "";
      if (!selected.includes("ctaGradient")) patch.ctaGradient = "";
      if (!selected.includes("ctaTextColor")) patch.ctaTextColor = "";
    }
    onApply(patch);
    setApplied(true);
  }
  return (
    <section
      className={s.card}
      aria-labelledby="website-import-title"
      aria-busy={busy}
    >
      <div className={s.heading}>
        <div className={s.headingCopy}>
          <div className={s.smartLabel}>
            <AiSpark size={18} />
            <span>AI setup</span>
          </div>
          <h2 id="website-import-title">Start with your hospital website</h2>
          <p>Find your logos, fonts and colours, then choose what to use.</p>
        </div>
      </div>
      <div className={s.form}>
        <label htmlFor="hospital-website-url">Hospital website</label>
        <div className={s.inputRow}>
          <input
            id="hospital-website-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://yourhospital.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-describedby={error ? "website-import-error" : undefined}
            aria-invalid={!!error}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                analyze(e);
              }
            }}
          />
          <Button
            type="button"
            onClick={analyze}
            className={s.analyzeButton}
            disabled={busy || !url.trim()}
          >
            {busy ? "Analyzing…" : "Analyze website"}
          </Button>
        </div>
      </div>
      {busy && (
        <div className={s.loadingPanel} role="status" aria-live="polite">
          <div className={s.loadingHeading}>
            <span className={s.loadingSpark}>
              <AiSpark size={24} />
            </span>
            <div>
              <strong>Discovering your brand</strong>
              <p>Looking for logos, brand colours and typography.</p>
            </div>
          </div>
          <div className={s.loadingCards} aria-hidden="true">
            {["Logos", "Colours", "Typography"].map((label) => (
              <div key={label}>
                <span className={s.loadingPlaceholder} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <small>This may take a few seconds.</small>
        </div>
      )}
      {error && (
        <p id="website-import-error" className={s.error} role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className={s.results}>
          <div>
            <h3>Review detected branding</h3>
            <p>
              Selected colours preview instantly. Untick a colour to restore
              your draft’s previous colour.
            </p>
            {result.detectionNote && (
              <p className={s.detectionMode}>{result.detectionNote}</p>
            )}
            <p className={s.source}>
              From {new URL(result.url).hostname}. These are suggestions; check
              them before applying.
            </p>
          </div>
          {
            <fieldset className={s.options}>
              <legend className={s.srOnly}>Brand details to apply</legend>
              {result.candidates.map((c) => (
                <label key={c.key} className={s.option}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.key)}
                    disabled={
                      ["logo", "logoMark"].includes(c.key) &&
                      !verifiedLogos.includes(c.key)
                    }
                    onChange={(e) => {
                      setApplied(false);
                      setSelected((current) =>
                        e.target.checked
                          ? [...current, c.key]
                          : current.filter((k) => k !== c.key),
                      );
                    }}
                  />
                  <span className={s.detail}>
                    <strong>{c.label}</strong>
                    {c.key === "logo" || c.key === "logoMark" ? (
                      <img
                        src={c.value}
                        alt={`Detected ${c.label.toLowerCase()}`}
                        className={s.logo}
                        onLoad={(event) => verifyLogo(event, c)}
                        onError={() => rejectLogo(c)}
                      />
                    ) : (
                      <span className={s.value}>
                        {[
                          "primary",
                          "accent",
                          "textHeading",
                          "textBody",
                          "ctaGradient",
                          "ctaColor",
                          "ctaTextColor",
                        ].includes(c.key) && (
                          <i
                            className={
                              c.key === "ctaGradient"
                                ? s.gradientSwatch
                                : s.swatch
                            }
                            style={{ background: c.value }}
                          />
                        )}
                        {c.key === "ctaGradient"
                          ? c.value
                          : c.key === "radius"
                            ? `${c.value}px`
                            : c.value}
                      </span>
                    )}
                    <small>{c.evidence}</small>
                  </span>
                </label>
              ))}
              {expectedFields
                .filter(
                  ([key]) =>
                    !result.candidates.some(
                      (c) =>
                        c.key === key ||
                        (key === "ctaColor" && c.key === "ctaGradient"),
                    ),
                )
                .map(([key, label]) => (
                  <div key={key} className={`${s.option} ${s.missing}`}>
                    <input
                      type="checkbox"
                      disabled
                      aria-label={`${label}: Couldn't detect`}
                    />
                    <div className={s.detail}>
                      <strong>{label}</strong>
                      <span className={s.missingBadge}>Missing</span>
                      <span className={s.source}>
                        {result.missingLogos?.[key] || "Couldn't detect"}
                      </span>
                      {["logo", "logoMark"].includes(key) &&
                        onUploadMissing && (
                          <button
                            className={s.uploadMissing}
                            type="button"
                            onClick={() => onUploadMissing(key)}
                          >
                            Upload{" "}
                            {key === "logo" ? "horizontal logo" : "app icon"}
                          </button>
                        )}
                    </div>
                  </div>
                ))}
            </fieldset>
          }
          {result.warnings?.length > 0 && (
            <ul className={s.warnings}>
              {result.warnings.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          <p className={s.source}>
            Missing and unchecked fields stay unchanged. Applying updates this
            draft; save the configuration when ready.
          </p>
          {result.candidates.length > 0 && (
            <Button
              type="button"
              onClick={apply}
              disabled={!selected.length || applied}
            >
              {applied ? "Added to draft" : "Apply selected to draft"}
            </Button>
          )}
          {applied && (
            <p role="status" className={s.status}>
              Selected branding added to your draft. Review the preview before
              saving.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
