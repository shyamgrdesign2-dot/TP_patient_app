import { locations } from "../shared/brand";
import { Icon } from "../shared/ui";
import s from "./Admin.module.css";

// Building blocks shared by the admin console pages.
export function Field({ label, hint, children }) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      {children}
      {hint && <small className={s.hint}>{hint}</small>}
    </label>
  );
}

// Clinics come from Tatva Practice only; the console adds app-facing
// extras (photos, a note for patients) kept under clinicExtras.
export const allClinics = (config = {}) =>
  locations.map((l) => ({ ...l, ...config.clinicExtras?.[l.id] }));

export function Drawer({ title, onClose, footer, children }) {
  return (
    <div className={s.drawerScrim} onClick={onClose}>
      <aside className={s.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header className={s.drawerHead}>
          <h2>{title}</h2>
          <button className={s.iconBtn} aria-label="Close" onClick={onClose}>
            <Icon name="close" size={22} />
          </button>
        </header>
        <div className={s.drawerBody}>{children}</div>
        <footer className={s.drawerFoot}>{footer}</footer>
      </aside>
    </div>
  );
}

export function PageTitle({ title, sub, action }) {
  return (
    <header className={s.pageTitle}>
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </header>
  );
}

// Small inline note with an info icon.
export function InfoNote({ children }) {
  return (
    <p className={s.infoNote}>
      <Icon name="info-circle" size={16} />
      <span>{children}</span>
    </p>
  );
}

// Read a picked file as a data URL, rejecting files over `maxMb`.
export function readFileAsDataUrl(file, maxMb = 2) {
  return new Promise((resolve, reject) => {
    if (file.size > maxMb * 1024 * 1024)
      return reject(new Error(`Choose a file under ${maxMb} MB.`));
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("That file could not be read."));
    r.readAsDataURL(file);
  });
}
