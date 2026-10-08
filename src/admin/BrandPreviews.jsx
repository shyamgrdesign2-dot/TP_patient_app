import { brandMarkSrc } from "../shared/brand";
import { Icon } from "../shared/ui";
import { BrandLogo, BrandMark } from "../patient/components/ui";
import s from "./Admin.module.css";

export const LOGO_TIPS = [
  "PNG with a transparent background",
  "Square mark: at least 512×512 px (1024×1024 ideal), keep ~10% empty space around it",
  "Horizontal logo: 4:1, e.g. 1200×300 px",
  "Use a version that reads on white; avoid thin text",
  "Max 5 MB",
];

// What makes a logo work in the app, with the two shapes it is cropped to.
export function LogoGuidance() {
  return (
    <div className={s.logoGuide}>
      <div className={s.ratioViz} aria-hidden="true">
        <span data-ratio="square">1:1</span>
        <span data-ratio="wide">4:1</span>
      </div>
      <ul>
        {LOGO_TIPS.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}

// The patient app's header, splash screen and home-screen icon for a
// brand, drawn from the given values so the form previews before saving.
export default function BrandPreviews({ brand }) {
  const mark = brandMarkSrc(brand);
  return (
    <div className={s.brandPreviews}>
      <figure>
        <div className={s.pvHeader}>
          <div className={s.pvStatus} aria-hidden="true">
            <span>9:41</span>
          </div>
          <div className={s.pvBar}>
            <BrandLogo brand={brand} height={26} />
            <Icon name="notification-2" size={18} />
          </div>
          <div className={s.pvLines} aria-hidden="true">
            <span />
            <span />
          </div>
        </div>
        <figcaption>App header</figcaption>
      </figure>
      <figure>
        <div className={s.pvSplash}>
          <BrandMark brand={brand} size={44} />
          <strong>{brand.hospitalName}</strong>
        </div>
        <figcaption>Splash screen</figcaption>
      </figure>
      <figure>
        <div className={s.pvHome} style={{ "--pv-primary": brand.primary }}>
          <span className={s.pvIcon} data-mark={!!mark || undefined}>
            <BrandMark brand={brand} size={mark ? 46 : 56} />
          </span>
          <small>{brand.name}</small>
        </div>
        <figcaption>App icon</figcaption>
      </figure>
    </div>
  );
}
