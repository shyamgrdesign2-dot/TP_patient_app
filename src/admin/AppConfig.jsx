import { useEffect, useRef, useState } from "react";
import { Toggle } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../patient/state/AppContext";
import {
  brandMarkSrc,
  customFontName,
  fontFamily,
  fontStack,
  googleFonts,
  hospitalCallHref,
  loadBrandFonts,
  logoFileError,
  validBrand,
  whiteTextContrast,
} from "../shared/brand";
import { Icon } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { Field, InfoNote, PageTitle, readFileAsDataUrl } from "./AdminParts";
import LogoCropper, { loadLogoSource } from "./LogoCropper";
import BrandPreviews, { LogoGuidance } from "./BrandPreviews";
import s from "./Admin.module.css";

export const FEATURES = [
  ["videoConsult", "Video consultations", "Patients can book and join video visits"],
  ["symptomCollector", "Symptom collector", "Patients share symptoms before a visit"],
  ["abha", "ABHA linking", "Create or link ABHA and sync records"],
  ["bills", "Bills & receipts", "Show invoices and payment status"],
  ["familyProfiles", "Family profiles", "Manage care for family members"],
  ["recordUploads", "Patient uploads", "Patients can upload their own documents"],
  ["packages", "Health packages & vaccines", "Patients can browse packages and vaccines and request a booking"],
];
const PHONES = [
  ["emergencyPhone", "Emergency number", "Shown in the app's emergency sheet", "e.g. 080 4000 1000", "Emergency"],
  ["ambulancePhone", "Ambulance number", "", "e.g. 108", "Ambulance"],
  ["bookingPhone", "Appointment booking / front desk number", "", "e.g. 080 4718 2000", "Front desk"],
  ["whatsappPhone", "WhatsApp number", "Patients can chat with the front desk", "e.g. 98450 12345", "WhatsApp"],
  ["billingPhone", "Billing / insurance desk number", "Optional", "e.g. 080 4718 2010", "Billing / insurance"],
];
const SECTIONS = [
  ["hospital", "Hospital"],
  ["theme", "Theme"],
  ["fonts", "Fonts"],
  ["contacts", "Contacts"],
  ["policies", "Appointments"],
  ["features", "Features"],
];
const hoursLabel = (n) => (n ? `${n} hours` : "Any time");
const validPhone = (v) => !v || !!hospitalCallHref(v);

// Hospital details, theme, fonts, contacts, appointment policy and
// features. Shows a live preview of the patient app with a read-only
// summary; Edit opens the form in a panel beside the preview.
export default function AppConfig({ config, setConfig, flash }) {
  const { brand, saveBrand, state } = useApp();
  // The patient preview's "Customise" link lands on the theme section.
  const [editing, setEditing] = useState(() =>
    window.location.hash === "#theme" ? "theme" : null,
  );
  const frame = useRef(null);
  const waiting = (state.callbackRequests || []).filter((r) => r.status === "Requested").length;
  return (
    <>
      <PageTitle
        title="App configuration"
        sub="Hospital details, theme and policies patients see across the app."
        action={
          !editing && (
            <Button onClick={() => setEditing("hospital")}>
              <Icon name="edit" size={18} /> Edit
            </Button>
          )
        }
      />
      <div className={s.appLayout}>
        <div className={s.previewCol}>
          <div className={s.device}>
            <iframe ref={frame} title="Patient app preview" src="/" />
          </div>
          <small className={s.muted}>Live preview · updates when you save</small>
        </div>
        {editing ? (
          <ConfigEditor
            key="editor"
            brand={brand}
            config={config}
            section={editing}
            onCancel={() => setEditing(null)}
            onSave={(nextBrand, nextConfig) => {
              // The logo and fonts live in this browser's storage; say so
              // when they don't fit rather than losing them on reload.
              if (!saveBrand(nextBrand))
                return "Couldn't save: this browser's storage is full. Remove a custom font or upload a smaller logo, then try again.";
              setConfig(nextConfig);
              setEditing(null);
              flash("App configuration saved");
              setTimeout(() => frame.current?.contentWindow?.location.reload(), 150);
            }}
          />
        ) : (
          <ConfigSummary brand={brand} config={config} waiting={waiting} onEdit={setEditing} />
        )}
      </div>
    </>
  );
}

function SummaryCard({ id, title, onEdit, children, wide }) {
  return (
    <section className={s.summaryCard} data-wide={wide || undefined} aria-labelledby={`sum-${id}`}>
      <header>
        <h2 id={`sum-${id}`}>{title}</h2>
        <button type="button" className={s.linkBtn} onClick={() => onEdit(id)} aria-label={`Edit ${title.toLowerCase()}`}>
          Edit
        </button>
      </header>
      {children}
    </section>
  );
}

function Fact({ label, children }) {
  return (
    <div className={s.fact}>
      <dt>{label}</dt>
      <dd>{children || <span className={s.notSet}>Not set</span>}</dd>
    </div>
  );
}

function ConfigSummary({ brand, config, waiting, onEdit }) {
  const { support, booking, features } = config;
  return (
    <div className={s.summary}>
      <SummaryCard id="hospital" title="Hospital & logo" onEdit={onEdit} wide>
        <div className={s.summaryBrand}>
          <div className={s.summaryHospital}>
            <span className={s.brandMark} data-small>
              {brandMarkSrc(brand) ? (
                <img src={brandMarkSrc(brand)} alt="Hospital logo" />
              ) : (
                <Icon name="hospital" family="building" bulk size={20} />
              )}
            </span>
            <div>
              <strong>{brand.hospitalName}</strong>
              <small>
                {brand.name} · {brand.tagline}
              </small>
            </div>
          </div>
          <BrandPreviews brand={brand} />
        </div>
      </SummaryCard>
      <SummaryCard id="theme" title="Theme & fonts" onEdit={onEdit}>
        <dl className={s.facts}>
          {[
            ["Primary", brand.primary],
            ["Accent", brand.accent],
          ].map(([label, hex]) => (
            <Fact key={label} label={label}>
              <span className={s.swatchValue}>
                <span style={{ background: hex }} aria-hidden="true" />
                {hex.toUpperCase()}
              </span>
            </Fact>
          ))}
          <Fact label="Headings">
            <span style={{ fontFamily: brand.fontHeading, fontWeight: 700 }}>{fontFamily(brand.fontHeading)}</span>
          </Fact>
          <Fact label="Body">
            <span style={{ fontFamily: brand.fontBody }}>{fontFamily(brand.fontBody)}</span>
          </Fact>
        </dl>
      </SummaryCard>
      <SummaryCard id="policies" title="Appointments" onEdit={onEdit}>
        <dl className={s.facts}>
          <Fact label="Cancellation cutoff">{hoursLabel(booking.cancelCutoffHours)}</Fact>
          <Fact label="Booking window">{booking.windowDays} days ahead</Fact>
        </dl>
      </SummaryCard>
      <SummaryCard id="contacts" title="Contacts" onEdit={onEdit} wide>
        <dl className={s.facts} data-cols="3">
          {PHONES.map(([key, , , , short]) => (
            <Fact key={key} label={short}>
              {brand[key]}
            </Fact>
          ))}
          <Fact label="Patient support">
            {[support.phone, support.email].filter(Boolean).join(" · ")}
          </Fact>
          <Fact label="Request a callback">
            {brand.callbackEnabled
              ? `On${waiting ? ` · ${waiting} waiting` : ""}`
              : "Off"}
          </Fact>
        </dl>
      </SummaryCard>
      <SummaryCard id="features" title="Features" onEdit={onEdit}>
        <ul className={s.featureList}>
          {FEATURES.map(([key, title]) => (
            <li key={key} data-on={!!features[key]}>
              <Icon name={features[key] ? "tick-circle" : "close-circle"} size={16} />
              {title}
            </li>
          ))}
        </ul>
      </SummaryCard>
    </div>
  );
}

function ColorField({ label, hint, value, onChange, warning }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <fieldset className={s.fieldset}>
      <legend className={s.label}>{label}</legend>
      <div className={s.colorRow}>
        <input
          type="color"
          className={s.colorPicker}
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
          title="Pick any colour"
        />
        <input
          className={s.input}
          data-narrow
          value={value}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={(e) => onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
        />
        <span className={s.contrastPreview} style={{ background: hex }}>
          Aa
        </span>
      </div>
      {warning ? (
        <small className={s.hint} data-warn role="status">
          <Icon name="info-circle" size={14} /> {warning}
        </small>
      ) : (
        hint && <small className={s.hint}>{hint}</small>
      )}
    </fieldset>
  );
}

function ConfigEditor({ brand, config, section, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({ ...brand, customFonts: brand.customFonts || [] }));
  const [support, setSupport] = useState(config.support);
  const [booking, setBooking] = useState(config.booking);
  const [features, setFeatures] = useState(config.features);
  const [fontError, setFontError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [cropSource, setCropSource] = useState(null);
  const [saveError, setSaveError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const logo = useRef(null);
  const fontFile = useRef(null);
  const body = useRef(null);
  const contrast = whiteTextContrast(form.primary);
  const badPhones = PHONES.filter(([k]) => !validPhone(form[k])).map(([k]) => k);
  const hexOk = /^#[0-9a-f]{6}$/i;
  const ok = validBrand(form) && form.hospitalName.trim() && !badPhones.length && validPhone(support.phone);
  const fonts = [
    ...googleFonts.map(([name]) => name),
    ...form.customFonts.map((f) => f.name).filter((n) => !googleFonts.some(([g]) => g === n)),
  ];

  // Scroll the panel (not the page) to a section.
  const goTo = (id, behavior = "smooth") => {
    const el = document.getElementById(`edit-${id}`);
    const box = body.current;
    if (!el || !box) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    box.scrollTo({ top: top - 8, behavior });
  };
  useEffect(() => goTo(section, "instant"), [section]);
  // Load the fonts being chosen so their samples render here; restore the
  // saved brand's fonts on close.
  useEffect(() => {
    loadBrandFonts(form);
  }, [form]);
  useEffect(() => () => loadBrandFonts(brand), [brand]);

  return (
    <section className={s.editPanel} aria-label="Edit app configuration">
      <header className={s.editHead}>
        <h2>Edit configuration</h2>
        <nav className={s.editNav} aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <div className={s.editBody} ref={body}>
        <div className={s.editSection} id="edit-hospital">
          <h3>Hospital</h3>
          <div className={s.grid2}>
            <Field label="Hospital name">
              <input className={s.input} value={form.hospitalName} onChange={set("hospitalName")} />
            </Field>
            <Field label="App name" hint="Shown on the home screen and app store">
              <input className={s.input} value={form.name} onChange={set("name")} />
            </Field>
            <Field label="Tagline">
              <input className={s.input} value={form.tagline} onChange={set("tagline")} />
            </Field>
          </div>
          <div className={s.field}>
            <span className={s.label}>Logo</span>
            <div className={s.logoBlock}>
              <div>
                <div className={s.logoThumbs}>
                  <figure>
                    <span className={`${s.logoThumb} ${s.checker}`} data-shape="square">
                      {brandMarkSrc(form) ? (
                        <img src={brandMarkSrc(form)} alt="Logo mark" />
                      ) : (
                        <Icon name="gallery" size={20} />
                      )}
                    </span>
                    <figcaption>Mark · 1:1</figcaption>
                  </figure>
                  <figure>
                    <span className={`${s.logoThumb} ${s.checker}`} data-shape="wide">
                      {form.logo ? (
                        <img src={form.logo} alt="Horizontal logo" />
                      ) : (
                        <small>{brandMarkSrc(form) ? "Not set · the mark and hospital name are used" : "Not set"}</small>
                      )}
                    </span>
                    <figcaption>Horizontal · 4:1</figcaption>
                  </figure>
                </div>
                <div className={s.logoRow}>
                  <Button variant="outline" size="sm" onClick={() => logo.current?.click()}>
                    <Icon name="gallery-add" size={16} /> {brandMarkSrc(form) ? "Replace logo" : "Upload logo"}
                  </Button>
                  {brandMarkSrc(form) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      theme="neutral"
                      onClick={() => setForm({ ...form, logo: "", logoMark: "" })}
                    >
                      Remove
                    </Button>
                  )}
                  <input
                    ref={logo}
                    type="file"
                    accept="image/png"
                    aria-label="Logo file"
                    data-testid="logo-file"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      const error = logoFileError(f);
                      setLogoError(error);
                      if (error) return;
                      try {
                        setCropSource(await loadLogoSource(f));
                      } catch (err) {
                        setLogoError(err.message);
                      }
                    }}
                  />
                </div>
                {logoError && (
                  <small className={s.hint} data-error role="alert">
                    {logoError}
                  </small>
                )}
              </div>
              <LogoGuidance />
            </div>
          </div>
          <div className={s.field}>
            <span className={s.label}>Preview</span>
            <BrandPreviews brand={form} />
            <small className={s.hint}>How patients see your logo. Updates as you edit; applies when you save.</small>
          </div>
          {cropSource && (
            <LogoCropper
              source={cropSource}
              onCancel={() => setCropSource(null)}
              onApply={({ mark, horizontal }) => {
                setForm((f) => ({ ...f, logoMark: mark, logo: horizontal }));
                setCropSource(null);
              }}
            />
          )}
        </div>

        <div className={s.editSection} id="edit-theme">
          <h3>Theme</h3>
          <div className={s.grid2}>
            <ColorField
              label="Primary colour"
              hint="Buttons, links and highlights"
              value={form.primary}
              onChange={(primary) => setForm({ ...form, primary })}
              warning={
                !hexOk.test(form.primary)
                  ? "Enter a 6-digit hex colour, e.g. #4B4AD5."
                  : contrast < 4.5
                    ? `Too light for white button text (${contrast.toFixed(1)}:1, needs 4.5:1). Choose a darker shade.`
                    : ""
              }
            />
            <ColorField
              label="Accent colour"
              hint="Secondary highlights"
              value={form.accent}
              onChange={(accent) => setForm({ ...form, accent })}
              warning={hexOk.test(form.accent) ? "" : "Enter a 6-digit hex colour, e.g. #A461D8."}
            />
          </div>
        </div>

        <div className={s.editSection} id="edit-fonts">
          <h3>Fonts</h3>
          <div className={s.grid2}>
            {[
              ["fontHeading", "Heading font", "Book a visit", 700],
              ["fontBody", "Body font", "Your lab report is ready to view.", 400],
            ].map(([k, label, sample, weight]) => (
              <Field key={k} label={label}>
                <select
                  className={s.input}
                  value={fontFamily(form[k])}
                  onChange={(e) => setForm({ ...form, [k]: fontStack(e.target.value) })}
                >
                  {fonts.map((f) => (
                    <option key={f} value={f}>
                      {f}
                      {form.customFonts.some((c) => c.name === f) ? " (uploaded)" : ""}
                    </option>
                  ))}
                </select>
                <span className={s.fontSample} style={{ fontFamily: form[k], fontWeight: weight }}>
                  {sample}
                </span>
              </Field>
            ))}
          </div>
          <div className={s.fontUploads}>
            {form.customFonts.map((f) => (
              <span key={f.name} className={s.fontChip}>
                <span style={{ fontFamily: fontStack(f.name) }}>{f.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      customFonts: form.customFonts.filter((c) => c.name !== f.name),
                      fontHeading: fontFamily(form.fontHeading) === f.name ? brandDefault("heading") : form.fontHeading,
                      fontBody: fontFamily(form.fontBody) === f.name ? brandDefault("body") : form.fontBody,
                    })
                  }
                >
                  <Icon name="close-plain" size={14} />
                </button>
              </span>
            ))}
            <Button variant="outline" size="sm" onClick={() => fontFile.current?.click()}>
              <Icon name="add" size={16} /> Upload custom font
            </Button>
            <input
              ref={fontFile}
              type="file"
              accept=".woff2,.woff,.ttf,.otf"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const ext = (/\.(woff2?|ttf|otf)$/i.exec(f.name) || [])[1]?.toLowerCase();
                if (!ext) return setFontError("Choose a .woff2, .woff, .ttf or .otf file.");
                try {
                  const data = await readFileAsDataUrl(f, 1.5);
                  const src = `data:font/${ext};base64,${data.split(",")[1]}`;
                  const name = customFontName(f.name);
                  setFontError("");
                  setForm({
                    ...form,
                    customFonts: [...form.customFonts.filter((c) => c.name !== name), { name, src }],
                  });
                } catch (err) {
                  setFontError(err.message);
                }
              }}
            />
          </div>
          {fontError ? (
            <small className={s.hint} data-error>{fontError}</small>
          ) : (
            <small className={s.hint}>
              Upload your brand font (.woff2, .woff, .ttf or .otf, under 1.5 MB), then choose it above.
            </small>
          )}
        </div>

        <div className={s.editSection} id="edit-contacts">
          <h3>Contacts</h3>
          <div className={s.grid2}>
            {PHONES.map(([k, label, hint, placeholder]) => (
              <Field key={k} label={label} hint={badPhones.includes(k) ? "Enter a valid phone number" : hint}>
                <input
                  className={s.input}
                  inputMode="tel"
                  value={form[k] || ""}
                  onChange={set(k)}
                  placeholder={placeholder}
                  aria-invalid={badPhones.includes(k) || undefined}
                />
              </Field>
            ))}
            <Field label="Patient support phone" hint={validPhone(support.phone) ? "" : "Enter a valid phone number"}>
              <input className={s.input} inputMode="tel" value={support.phone} onChange={(e) => setSupport({ ...support, phone: e.target.value })} />
            </Field>
            <Field label="Patient support email">
              <input className={s.input} type="email" value={support.email} onChange={(e) => setSupport({ ...support, email: e.target.value })} />
            </Field>
          </div>
          <div className={s.toggleRow}>
            <div>
              <strong>Request a callback</strong>
              <small>Patients can ask the front desk to call them back from the app</small>
            </div>
            <Toggle
              ariaLabel="Request a callback"
              checked={!!form.callbackEnabled}
              onCheckedChange={(on) => setForm({ ...form, callbackEnabled: on })}
            />
          </div>
        </div>

        <div className={s.editSection} id="edit-policies">
          <h3>Appointments</h3>
          <div className={s.grid2}>
            <Field label="Cancellation cutoff" hint="Patients can't cancel or reschedule within this many hours of the visit">
              <select className={s.input} value={booking.cancelCutoffHours} onChange={(e) => setBooking({ ...booking, cancelCutoffHours: Number(e.target.value) })}>
                {[0, 1, 2, 4, 12, 24].map((n) => <option key={n} value={n}>{hoursLabel(n)}</option>)}
              </select>
            </Field>
            <Field label="Booking window" hint="How far ahead patients can book">
              <select className={s.input} value={booking.windowDays} onChange={(e) => setBooking({ ...booking, windowDays: Number(e.target.value) })}>
                {[7, 14, 30, 60, 90].map((n) => <option key={n} value={n}>{n} days</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className={s.editSection} id="edit-features">
          <h3>Features</h3>
          <div className={s.toggles} data-single>
            {FEATURES.map(([key, title, sub]) => (
              <div className={s.toggleRow} key={key}>
                <div>
                  <strong>{title}</strong>
                  <small>{sub}</small>
                </div>
                <Toggle
                  ariaLabel={title}
                  checked={!!features[key]}
                  onCheckedChange={(on) => setFeatures({ ...features, [key]: on })}
                />
              </div>
            ))}
          </div>
        </div>
        <InfoNote>Changes apply to the patient app when you save.</InfoNote>
      </div>
      <footer className={s.editFoot}>
        {saveError && (
          <small className={s.hint} data-error role="alert">
            {saveError}
          </small>
        )}
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          disabled={!ok}
          onClick={() =>
            setSaveError(onSave({ ...brand, ...form }, { ...config, support, booking, features }) || "")
          }
        >
          Save changes
        </Button>
      </footer>
    </section>
  );
}

const brandDefault = (kind) =>
  kind === "heading" ? "Mulish, system-ui, sans-serif" : "Inter, system-ui, sans-serif";
