import { useEffect, useRef, useState } from "react";
import { Button } from "../patient/components/ui";
import { AiSpark } from "../patient/components/AiNote";
import s from "./BrandWebsiteImport.module.css";
import { fontStack, googleFonts } from "../shared/brand";

const availableFonts = new Set(googleFonts.map(([name]) => name));
const supportedFields = new Set([
  "hospitalName",
  "logoMark",
  "logo",
  "primary",
  "textHeading",
  "textBody",
  "fontHeading",
  "fontBody",
]);

// Check a detected image on white before replacing an existing logo.
async function usableLogo(value) {
  if (
    !/^data:image\/(png|jpeg|webp|svg\+xml|x-icon|vnd.microsoft.icon);base64,/i.test(
      value,
    )
  )
    return false;
  const image = new Image();
  let timer;
  try {
    image.src = value;
    await Promise.race([
      image.decode(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Logo timed out")), 5000);
      }),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = Math.max(
      1,
      Math.round((240 * image.naturalHeight) / image.naturalWidth),
    );
    if (!image.naturalWidth || canvas.height > 1024) return false;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 230) visible++;
    return visible >= 8;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default function BrandWebsiteImport({ onApply, onReview }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  async function analyze(event) {
    event.preventDefault();
    if (busy) return;
    let website = url.trim();
    if (!/^https?:\/\//i.test(website)) website = "https://" + website;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/brand-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
        signal: controller.signal,
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          "Website import is unavailable on this host. You can still enter brand details below.",
        );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not analyze this website.");
      const candidates = data.candidates.filter(
        (c) =>
          supportedFields.has(c.key) &&
          (!c.key.startsWith("font") || availableFonts.has(c.value)),
      );
      const checked = await Promise.all(
        candidates.map(async (c) =>
          c.key.startsWith("logo") && !(await usableLogo(c.value)) ? null : c,
        ),
      );
      if (controller.signal.aborted || request.current !== controller) return;
      const patch = Object.fromEntries(
        checked
          .filter(Boolean)
          .map((c) => [
            c.key,
            c.key.startsWith("font") ? fontStack(c.value) : c.value,
          ]),
      );
      if (patch.primary)
        Object.assign(patch, {
          ctaColor: "",
          ctaGradient: "",
          ctaTextColor: "",
        });
      if (Object.keys(patch).length) onApply(patch);
      const warnings = [...(data.warnings || [])];
      if (checked.some((c) => !c))
        warnings.push(
          "Some logos could not be displayed clearly on white. Your existing logos were kept; you can edit or replace them below.",
        );
      setResult({ count: checked.filter(Boolean).length, warnings });
    } catch (issue) {
      if (issue.name !== "AbortError") setError(issue.message);
    } finally {
      if (request.current === controller) setBusy(false);
    }
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
          <p>
            Find your logos, fonts and colours and fill in the details below.
          </p>
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
        <div className={result.count ? s.success : s.noResults}>
          <div role="status">
            <strong>
              {result.count
                ? "Your brand details are ready"
                : "No brand details could be detected"}
            </strong>
            <p>
              {result.count
                ? "We’ve filled in the details below. Review your hospital identity, theme and fonts, then check contacts, appointments and features before saving. Anything we couldn’t detect keeps its current value."
                : "Your current details are unchanged. You can enter colours, fonts and hospital details, and upload logos below."}
            </p>
          </div>
          {result.warnings.length > 0 && (
            <ul className={s.warnings}>
              {result.warnings.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {result.count > 0 && (
            <Button variant="outline" onClick={onReview}>
              Review app details
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
