import { useEffect, useRef, useState } from "react";
import { Slider, Tabs, TabsList, TabsTrigger } from "@dhspl-tatvacare/tesseract-ui";
import { Icon } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { LogoGuidance } from "./BrandPreviews";
import s from "./Admin.module.css";

// The two crops a hospital logo needs, with the frame shown in the dialog
// and the PNG size exported for the app.
export const CROPS = {
  mark: {
    title: "Logo mark",
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
const STAGE = [560, 300];
const MAX_SOURCE = 2048;
const ZOOM = { min: 0.5, max: 4 };

// Decode a PNG and downscale very large ones, so cropping stays fast and
// the exported data URLs stay small.
export async function loadLogoSource(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) throw new Error("That PNG could not be read.");
    const k = Math.min(1, MAX_SOURCE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { image: canvas, width: w, height: h };
  } catch (err) {
    throw new Error(err?.message?.includes("PNG") ? err.message : "That PNG could not be read.", { cause: err });
  } finally {
    URL.revokeObjectURL(url);
  }
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

export function exportCrop(img, crop, view) {
  const [ow, oh] = crop.out;
  const canvas = document.createElement("canvas");
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const p = placement(img, crop, view, ow / crop.frame[0]);
  // Nothing is painted behind the logo, so transparency is kept.
  ctx.drawImage(img, ow / 2 + p.x, oh / 2 + p.y, p.w, p.h);
  return canvas.toDataURL("image/png");
}

function tokens(el) {
  const css = getComputedStyle(el);
  const v = (name) => css.getPropertyValue(`--tesseract-${name}`).trim();
  return {
    stage: v("slate-100"),
    light: v("slate-0"),
    dark: v("slate-200"),
    scrim: v("slate-900"),
    frame: v("blue-500"),
  };
}

function draw(canvas, img, crop, view) {
  const dpr = window.devicePixelRatio || 1;
  const [SW, SH] = STAGE;
  if (canvas.width !== SW * dpr) {
    canvas.width = SW * dpr;
    canvas.height = SH * dpr;
  }
  const t = tokens(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingQuality = "high";
  const [fw, fh] = crop.frame;
  const fx = (SW - fw) / 2,
    fy = (SH - fh) / 2;
  ctx.fillStyle = t.stage;
  ctx.fillRect(0, 0, SW, SH);
  // A checkerboard inside the frame shows what is transparent.
  ctx.fillStyle = t.light;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = t.dark;
  const sq = 10;
  for (let row = 0; row * sq < fh; row++)
    for (let col = row % 2; col * sq < fw; col += 2)
      ctx.fillRect(fx + col * sq, fy + row * sq, Math.min(sq, fw - col * sq), Math.min(sq, fh - row * sq));
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

function CropStage({ img, crop, view, onView }) {
  const canvas = useRef(null);
  const drag = useRef(null);
  useEffect(() => {
    if (canvas.current) draw(canvas.current, img, crop, view);
  }, [img, crop, view]);
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
  const pan = (dx, dy) => onView(clamp({ ...view, x: view.x + dx, y: view.y + dy }));
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
        pan((e.clientX - drag.current.x) * ratio, (e.clientY - drag.current.y) * ratio);
        drag.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 24 : 6;
        const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!move) return;
        e.preventDefault();
        pan(...move);
      }}
    />
  );
}

// Crop an uploaded PNG into the square mark and the 4:1 horizontal logo.
// The horizontal crop can be skipped: the app then shows the mark beside
// the hospital name.
export default function LogoCropper({ source, onCancel, onApply }) {
  const [step, setStep] = useState("mark");
  const [views, setViews] = useState({ mark: freshView(), horizontal: freshView() });
  const dialog = useRef(null);
  const crop = CROPS[step];
  const view = views[step];
  const setView = (next) => setViews((v) => ({ ...v, [step]: next }));
  const setZoom = (zoom) =>
    setView({ zoom, x: (view.x * zoom) / view.zoom, y: (view.y * zoom) / view.zoom });
  const small = Math.min(source.width, source.height) < 512;
  const apply = (withHorizontal) =>
    onApply({
      mark: exportCrop(source.image, CROPS.mark, views.mark),
      horizontal: withHorizontal ? exportCrop(source.image, CROPS.horizontal, views.horizontal) : "",
    });

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      >
        <header className={s.drawerHead}>
          <h2 id="crop-title">Crop your logo</h2>
          <button type="button" className={s.iconBtn} aria-label="Close" onClick={onCancel}>
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className={s.cropBody}>
          <div className={s.cropMain}>
            <Tabs value={step} onValueChange={setStep} size="sm">
              <TabsList aria-label="Logo crops">
                <TabsTrigger value="mark">1. Logo mark · 1:1</TabsTrigger>
                <TabsTrigger value="horizontal">2. Horizontal logo · 4:1</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className={s.cropUse}>
              <strong>{crop.title}</strong> · {crop.use}. Exported at {crop.out.join(" × ")} px.
            </p>
            <CropStage img={source.image} crop={crop} view={view} onView={setView} />
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
              <Button variant="outline" size="sm" onClick={() => setView(freshView())}>
                <Icon name="refresh-circle" size={16} /> Fit to frame
              </Button>
            </div>
            <small className={s.hint}>
              Drag to position the logo{crop.safe ? "; keep it inside the dashed line" : ""}. Use the zoom to
              add or trim empty space.
            </small>
            {small && (
              <small className={s.hint} data-warn role="status">
                <Icon name="info-circle" size={14} /> This image is {source.width} × {source.height} px. For a sharp
                mark, upload at least 512 × 512 px.
              </small>
            )}
          </div>
          <aside className={s.cropAside}>
            <LogoGuidance />
          </aside>
        </div>
        <footer className={s.drawerFoot}>
          {step === "mark" ? (
            <>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={() => setStep("horizontal")}>Next: horizontal logo</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" theme="neutral" onClick={() => setStep("mark")} className={s.footStart}>
                Back
              </Button>
              <Button variant="outline" onClick={() => apply(false)}>
                Skip, use mark + name
              </Button>
              <Button onClick={() => apply(true)}>Use these logos</Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
