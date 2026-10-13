import { svgForWhiteBackground } from "../shared/logoContrast";
import { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@dhspl-tatvacare/tesseract-ui";
import { Icon } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { LogoGuidance } from "./BrandPreviews";
import s from "./Admin.module.css";

// The two crops a hospital logo needs, with the frame shown in the dialog
// and the PNG size exported for the app.
export const CROPS = {
  mark: {
    title: "App icon",
    ratio: "1:1",
    use: "App icon, splash screen, favicon and small avatar spots",
    frame: [240, 240],
    out: [512, 512],
    safe: 0.1,
  },
  horizontal: {
    title: "Horizontal logo",
    ratio: "4:1",
    use: "App headers and the welcome and sign-in screens",
    frame: [480, 120],
    out: [800, 200],
  },
};
const STAGE = [880, 300];
const MAX_SOURCE = 2048;
const ZOOM = { min: 0.5, max: 10 };

// Decode a PNG and downscale very large ones, so cropping stays fast and
// the exported data URLs stay small.
export async function loadLogoSource(file) {
  if (file.type === "image/svg+xml") {
    file = new File([svgForWhiteBackground(await file.text())], file.name, {
      type: file.type,
    });
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) throw new Error("That logo could not be read.");
    const k = Math.min(1, MAX_SOURCE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return {
      image: canvas,
      width: w,
      height: h,
      format:
        file.type === "image/svg+xml"
          ? "SVG"
          : file.type === "image/jpeg"
            ? "JPG"
            : "PNG",
      original:
        file.type === "image/svg+xml"
          ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(await file.text())))}`
          : null,
    };
  } catch (err) {
    throw new Error(
      err?.message?.includes("logo")
        ? err.message
        : "That logo could not be read.",
      { cause: err },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Remove only edge-connected pixels close to the dominant corner colour.
// Enclosed details and other colours remain untouched; the source is retained.
function removeSolidBackground(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data,
    w = canvas.width,
    h = canvas.height;
  const corners = [0, w - 1, (h - 1) * w, w * h - 1].map((index) =>
    Array.from(data.slice(index * 4, index * 4 + 4)),
  );
  const distance = (a, b) =>
    Math.max(
      Math.abs(a[0] - b[0]),
      Math.abs(a[1] - b[1]),
      Math.abs(a[2] - b[2]),
    );
  const opaque = corners.filter((color) => color[3] > 240);
  if (!opaque.length) return canvas;
  const background = opaque.sort(
    (a, b) =>
      opaque.filter((c) => distance(b, c) < 28).length -
      opaque.filter((c) => distance(a, c) < 28).length,
  )[0];
  const seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  let start = 0,
    end = 0;
  const add = (index) => {
    if (index < 0 || index >= seen.length || seen[index]) return;
    seen[index] = 1;
    const p = index * 4;
    if (
      data[p + 3] > 0 &&
      Math.max(
        Math.abs(data[p] - background[0]),
        Math.abs(data[p + 1] - background[1]),
        Math.abs(data[p + 2] - background[2]),
      ) > 28
    )
      return;
    queue[end++] = index;
  };
  for (let x = 0; x < w; x++) {
    add(x);
    add((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    add(y * w);
    add(y * w + w - 1);
  }
  while (start < end) {
    const index = queue[start++];
    data[index * 4 + 3] = 0;
    if (index % w > 0) add(index - 1);
    if (index % w < w - 1) add(index + 1);
    add(index - w);
    add(index + w);
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

const fitScale = (img, [fw, fh]) => Math.min(fw / img.width, fh / img.height);
const freshView = () => ({ zoom: 1, x: 0, y: 0 });

// Where the image sits for a crop, in frame pixels around the frame centre.
function placement(img, crop, view, k = 1) {
  const sc = fitScale(img, crop.frame) * view.zoom * k;
  const w = img.width * sc,
    h = img.height * sc;
  return { w, h, x: view.x * k - w / 2, y: view.y * k - h / 2 };
}

export function exportCrop(img, crop, view, background = null) {
  const [ow, oh] = crop.out;
  const canvas = document.createElement("canvas");
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const p = placement(img, crop, view, ow / crop.frame[0]);
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, ow, oh);
  }
  ctx.drawImage(img, ow / 2 + p.x, oh / 2 + p.y, p.w, p.h);
  return canvas.toDataURL("image/png");
}

function tokens(el, surface) {
  const css = getComputedStyle(el);
  const v = (name) => css.getPropertyValue(`--tesseract-${name}`).trim();
  return {
    stage: v("slate-100"),
    light: v(surface === "dark" ? "slate-800" : "slate-0"),
    dark: v(surface === "dark" ? "slate-700" : "slate-200"),
    scrim: v("slate-900"),
    frame: v("blue-500"),
  };
}

function draw(canvas, img, crop, view, surface, background) {
  const dpr = window.devicePixelRatio || 1;
  const [SW, SH] = STAGE;
  if (canvas.width !== SW * dpr) {
    canvas.width = SW * dpr;
    canvas.height = SH * dpr;
  }
  const t = tokens(canvas, surface);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = "high";
  const [fw, fh] = crop.frame;
  const fx = (SW - fw) / 2,
    fy = (SH - fh) / 2;
  ctx.fillStyle = t.stage;
  ctx.fillRect(0, 0, SW, SH);
  ctx.fillStyle = background || "#fff";
  ctx.fillRect(fx, fy, fw, fh);
  if (!background) {
    ctx.fillStyle = "#e7e7ec";
    for (let y = 0; y < fh; y += 12)
      for (let x = 0; x < fw; x += 12)
        if ((x / 12 + y / 12) % 2 === 0)
          ctx.fillRect(
            fx + x,
            fy + y,
            Math.min(12, fw - x),
            Math.min(12, fh - y),
          );
  }
  const p = placement(img, crop, view);
  ctx.drawImage(img, SW / 2 + p.x, SH / 2 + p.y, p.w, p.h);
  // Dim what falls outside the crop.
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = t.scrim;
  ctx.beginPath();
  ctx.rect(0, 0, SW, SH);
  ctx.rect(fx, fy, fw, fh);
  ctx.fill("evenodd");
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeStyle = t.frame;
  ctx.strokeRect(fx - 1, fy - 1, fw + 2, fh + 2);
  if (crop.safe) {
    // The ~10% breathing room a mark keeps around it.
    const inset = fw * crop.safe;
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.strokeRect(fx + inset, fy + inset, fw - inset * 2, fh - inset * 2);
    ctx.setLineDash([]);
  }
}

function CropStage({ img, crop, view, onView, surface, background }) {
  const canvas = useRef(null);
  const drag = useRef(null);
  useEffect(() => {
    if (canvas.current)
      draw(canvas.current, img, crop, view, surface, background);
  }, [img, crop, view, surface, background]);
  // Keep at least a sliver of the logo inside the frame.
  const clamp = (next) => {
    const p = placement(img, crop, next);
    const mx = (crop.frame[0] + p.w) / 2 - 12,
      my = (crop.frame[1] + p.h) / 2 - 12;
    return {
      ...next,
      x: Math.max(-mx, Math.min(mx, next.x)),
      y: Math.max(-my, Math.min(my, next.y)),
    };
  };
  const pan = (dx, dy) =>
    onView(clamp({ ...view, x: view.x + dx, y: view.y + dy }));
  return (
    <canvas
      ref={canvas}
      className={s.cropStage}
      tabIndex={0}
      role="img"
      aria-label={`${crop.title} crop area. Drag or use the arrow keys to move the logo.`}
      data-testid={`crop-${crop.ratio}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const ratio = STAGE[0] / e.currentTarget.getBoundingClientRect().width;
        pan(
          (e.clientX - drag.current.x) * ratio,
          (e.clientY - drag.current.y) * ratio,
        );
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 24 : 6;
        const move = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        }[e.key];
        if (!move) return;
        e.preventDefault();
        pan(...move);
      }}
    />
  );
}

// Each asset is cropped independently; applying one never replaces another.
export default function LogoCropper({
  source,
  kind = "mark",
  surface = "light",
  onCancel,
  onApply,
  onReplace,
  onRemove,
}) {
  const [view, setView] = useState(freshView);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [useBackground, setUseBackground] = useState(false);
  const [background, setBackground] = useState("#ffffff");
  const cleaned = useMemo(
    () =>
      removeBackground ? removeSolidBackground(source.image) : source.image,
    [source.image, removeBackground],
  );
  const cleanImage = useMemo(() => {
    if (!rotation) return cleaned;
    const canvas = document.createElement("canvas");
    canvas.width = rotation % 180 ? cleaned.height : cleaned.width;
    canvas.height = rotation % 180 ? cleaned.width : cleaned.height;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(cleaned, -cleaned.width / 2, -cleaned.height / 2);
    return canvas;
  }, [cleaned, rotation]);
  useEffect(() => {
    setView(freshView());
    setRotation(0);
    setRemoveBackground(false);
    setUseBackground(false);
  }, [source]);
  const dialog = useRef(null);
  const crop = CROPS[kind];
  const setZoom = (zoom) =>
    setView({
      zoom,
      x: (view.x * zoom) / view.zoom,
      y: (view.y * zoom) / view.zoom,
    });
  const small = source.width < crop.out[0] || source.height < crop.out[1];
  const title = `Crop ${crop.title.toLowerCase()}${surface === "dark" ? " for dark backgrounds" : ""}`;
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [onCancel]);

  return (
    <div className={s.modalScrim} onClick={onCancel}>
      <div
        ref={dialog}
        className={s.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const items = [
            ...event.currentTarget.querySelectorAll(
              'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
            ),
          ];
          const first = items[0],
            last = items.at(-1);
          if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === event.currentTarget)
          ) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className={s.drawerHead}>
          <h2 id="crop-title">{title}</h2>
          <button
            type="button"
            className={s.iconBtn}
            aria-label="Close"
            onClick={onCancel}
          >
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className={s.cropBody}>
          <div className={s.cropMain}>
            <CropStage
              img={cleanImage}
              crop={crop}
              view={view}
              onView={setView}
              surface={surface}
              background={useBackground ? background : null}
            />
            <div className={s.logoRow}>
              {onReplace && (
                <Button variant="outline" size="sm" onClick={onReplace}>
                  <Icon name="gallery-add" size={16} />
                  Replace image
                </Button>
              )}
              {onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  theme="error"
                  className={s.removeAsset}
                  onClick={onRemove}
                >
                  <Icon name="trash" size={16} />
                  Remove image
                </Button>
              )}
            </div>
            <div className={s.cropControls}>
              <Slider
                className={s.cropZoom}
                label="Zoom"
                min={ZOOM.min}
                max={ZOOM.max}
                step={0.01}
                value={view.zoom}
                showValue
                formatValue={(v) => `${Math.round(v * 100)}%`}
                onChange={(_, v) => setZoom(v)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView(freshView())}
              >
                <Icon name="refresh-circle" size={16} /> Fit to frame
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRotation((angle) => (angle + 90) % 360);
                  setView(freshView());
                }}
              >
                <Icon name="refresh-circle" size={16} /> Rotate 90°
              </Button>
            </div>
            <div className={s.backgroundRemoval}>
              <label>
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(event) =>
                    setRemoveBackground(event.target.checked)
                  }
                />{" "}
                Remove solid background
              </label>
              <small className={s.hint}>
                For plain backgrounds only. Review before applying; uncheck to
                restore the original. Saved as PNG.
              </small>
            </div>
            <div className={s.backgroundRemoval}>
              <label>
                <input
                  type="checkbox"
                  checked={useBackground}
                  onChange={(event) => setUseBackground(event.target.checked)}
                />{" "}
                Add background colour
              </label>
              {useBackground && (
                <label>
                  Background colour{" "}
                  <input
                    type="color"
                    aria-label="Background colour"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                  />
                </label>
              )}
            </div>
            <small className={s.hint}>
              Drag to position the logo
              {crop.safe ? "; keep it inside the dashed line" : ""}. Use the
              zoom to add or trim empty space.
            </small>
            {small && (
              <small className={s.hint} data-warn role="status">
                <Icon name="info-circle" size={14} /> This image is{" "}
                {source.width} × {source.height} px. For a sharp result, upload
                at least {crop.out.join(" × ")} px, or use SVG.
              </small>
            )}
          </div>
          <aside className={s.cropAside}>
            <p className={s.cropUse}>
              <strong>{crop.title}</strong> · {crop.use}.{" "}
              {source.original
                ? "Unedited SVGs stay vector. Edited artwork exports"
                : "Exports"}{" "}
              as PNG at {crop.out.join(" × ")} px.
            </p>
            <LogoGuidance />
          </aside>
        </div>
        <footer className={s.drawerFoot}>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onApply(
                source.original &&
                  !rotation &&
                  !removeBackground &&
                  !useBackground &&
                  view.zoom === 1 &&
                  !view.x &&
                  !view.y
                  ? source.original
                  : exportCrop(
                      cleanImage,
                      crop,
                      view,
                      useBackground ? background : null,
                    ),
              )
            }
          >
            Use {crop.title.toLowerCase()}
          </Button>
        </footer>
      </div>
    </div>
  );
}
