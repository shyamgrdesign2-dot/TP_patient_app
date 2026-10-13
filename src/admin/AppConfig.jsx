import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Toggle, SectionCard } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../patient/state/AppContext";
import {
  brandMarkSrc,
  defaultBrand,
  customFontName,
  fontFamily,
  fontStack,
  googleFonts,
  hospitalCallHref,
  logoFileError,
  validBrand,
  whiteTextContrast,
} from "../shared/brand";
import { Icon } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { Field, InfoNote, readFileAsDataUrl } from "./AdminParts";
import LogoCropper, { loadLogoSource } from "./LogoCropper";
import BrandPreviews from "./BrandPreviews";
import BrandWebsiteImport from "./BrandWebsiteImport";
import CtaGradientEditor from "./CtaGradientEditor";
import s from "./Admin.module.css";

export const FEATURES = [
  [
    "videoConsult",
    "Video consultations",
    "Patients can book and join video visits",
  ],
  [
    "symptomCollector",
    "Symptom collector",
    "Patients share symptoms before a visit",
  ],
  ["abha", "ABHA linking", "Create or link ABHA and sync records"],
  ["bills", "Bills & receipts", "Show invoices and payment status"],
  ["familyProfiles", "Family profiles", "Manage care for family members"],
  [
    "recordUploads",
    "Patient uploads",
    "Patients can upload their own documents",
  ],
  [
    "packages",
    "Health packages & vaccines",
    "Patients can browse packages and vaccines and request a booking",
  ],
];
const PHONES = [
  [
    "emergencyPhone",
    "Emergency number",
    "Shown in the app's emergency sheet",
    "e.g. 080 4000 1000",
    "Emergency",
  ],
  ["ambulancePhone", "Ambulance number", "", "e.g. 108", "Ambulance"],
  [
    "bookingPhone",
    "Appointment booking / front desk number",
    "",
    "e.g. 080 4718 2000",
    "Front desk",
  ],
  [
    "whatsappPhone",
    "WhatsApp number",
    "Patients can chat with the front desk",
    "e.g. 98450 12345",
    "WhatsApp",
  ],
  [
    "billingPhone",
    "Billing / insurance desk number",
    "Optional",
    "e.g. 080 4718 2010",
    "Billing / insurance",
  ],
];
const SECTIONS = [
  ["hospital", "Hospital", "hospital"],
  ["theme", "Theme", "color-swatch"],
  ["fonts", "Fonts", "text"],
  ["contacts", "Contacts", "call"],
  ["policies", "Appointments", "calendar"],
  ["features", "Features", "setting-2"],
];
const hoursLabel = (n) => (n ? `${n} hours` : "Any time");
const validPhone = (v) => !v || !!hospitalCallHref(v);

// Hospital details, theme, fonts, contacts, appointment policy and
// features. Shows a live preview of the patient app with a read-only
// summary; Edit opens the form in a panel beside the preview.
export default function AppConfig({ config, setConfig, flash }) {
  const { brand, saveBrand, state } = useApp();
  const [configured, setConfigured] = useState(
    () =>
      !!config.brandConfigured ||
      !!brand.logo ||
      !!brand.logoMark ||
      (brand.hospitalName &&
        ![defaultBrand.hospitalName, "Your hospital"].includes(
          brand.hospitalName,
        )),
  );
  // The patient preview's "Customise" link lands on the theme section.
  const [editing, setEditing] = useState(() =>
    ["#theme", "#features"].includes(window.location.hash)
      ? window.location.hash.slice(1)
      : configured
        ? null
        : "hospital",
  );
  const frame = useRef(null);
  const [actionHost, setActionHost] = useState(null);
  const waiting = (state.callbackRequests || []).filter(
    (r) => r.status === "Requested",
  ).length;
  return (
    <>
      <header className={s.configTopbar}>
        <div>
          <h1>App configuration</h1>
          <p>Hospital identity and your patient experience</p>
        </div>
        <div ref={setActionHost} className={s.configTopActions}>
          {!editing && (
            <Button onClick={() => setEditing("hospital")}>
              <Icon name="edit" size={18} /> Edit
            </Button>
          )}
        </div>
      </header>
      <div className={s.appLayout}>
        {editing ? (
          <ConfigEditor
            key="editor"
            brand={brand}
            config={config}
            unconfigured={!configured}
            section={editing}
            actionHost={actionHost}
            onCancel={() => setEditing(null)}
            onSave={(nextBrand, nextConfig) => {
              // The logo and fonts live in this browser's storage; say so
              // when they don't fit rather than losing them on reload.
              if (!saveBrand(nextBrand))
                return "Couldn't save: this browser's storage is full. Remove a custom font or upload a smaller logo, then try again.";
              setConfig({ ...nextConfig, brandConfigured: true });
              setConfigured(true);
              setEditing(null);
              flash("App configuration saved");
            }}
          />
        ) : !configured ? (
          <SectionCard
            title="Set up your patient app"
            subtitle="Add your hospital identity to get started."
            tone="neutral"
          >
            <Button onClick={() => setEditing("hospital")}>
              Start configuration
            </Button>
          </SectionCard>
        ) : (
          <ConfigSummary
            brand={brand}
            config={config}
            waiting={waiting}
            onEdit={setEditing}
          />
        )}
        <div className={s.previewCol}>
          <div className={s.device}>
            <iframe ref={frame} title="Patient app preview" src="/" />
          </div>
          <small className={s.muted}>Live preview · updates as you edit</small>
        </div>
      </div>
    </>
  );
}

function SummaryCard({ id, title, onEdit, children, wide }) {
  return (
    <section
      className={s.summaryCard}
      data-wide={wide || undefined}
      aria-labelledby={`sum-${id}`}
    >
      <header>
        <h2 id={`sum-${id}`}>{title}</h2>
        <button
          type="button"
          className={s.linkBtn}
          onClick={() => onEdit(id)}
          aria-label={`Edit ${title.toLowerCase()}`}
        >
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
              {brand.tagline && <small>{brand.tagline}</small>}
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
                <span
                  style={{
                    background: hex,
                    color: whiteTextContrast(hex) < 4.5 ? "#171725" : "#fff",
                  }}
                  aria-hidden="true"
                />
                {hex.toUpperCase()}
              </span>
            </Fact>
          ))}
          <Fact label="Headings">
            <span style={{ fontFamily: brand.fontHeading, fontWeight: 700 }}>
              {fontFamily(brand.fontHeading)}
            </span>
          </Fact>
          <Fact label="Body">
            <span style={{ fontFamily: brand.fontBody }}>
              {fontFamily(brand.fontBody)}
            </span>
          </Fact>
        </dl>
      </SummaryCard>
      <SummaryCard id="policies" title="Appointments" onEdit={onEdit}>
        <dl className={s.facts}>
          <Fact label="Cancellation cutoff">
            {hoursLabel(booking.cancelCutoffHours)}
          </Fact>
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
              <Icon
                name={features[key] ? "tick-circle" : "close-circle"}
                size={16}
              />
              {title}
            </li>
          ))}
        </ul>
      </SummaryCard>
    </div>
  );
}

function ColorField({ label, hint, value, onChange, warning }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#e6e6eb";
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
          placeholder="Choose a colour"
          onChange={(e) =>
            onChange(
              e.target.value.startsWith("#")
                ? e.target.value
                : `#${e.target.value}`,
            )
          }
        />
        <span
          className={s.contrastPreview}
          style={{
            background: hex,
            color: whiteTextContrast(hex) < 4.5 ? "#171725" : "#fff",
          }}
        >
          {value ? "Aa" : "—"}
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

function ConfigurationSection({ id, children }) {
  return (
    <SectionCard
      id={id}
      className={s.editSection}
      tone="neutral"
      padding={20}
      divided={false}
      elevation={false}
    >
      <div className={s.sectionContents}>{children}</div>
    </SectionCard>
  );
}

function ConfigEditor({
  brand,
  config,
  section,
  onCancel,
  onSave,
  actionHost,
  unconfigured,
}) {
  const { previewConfiguration, clearConfigurationPreview } = useApp();
  const savedConfig = useRef(config);
  const [form, setForm] = useState(() => ({
    ...brand,
    customFonts: brand.customFonts || [],
    ...(unconfigured
      ? {
          name: "",
          hospitalName: "",
          tagline: "",
          primary: "",
          accent: "",
          logo: "",
          logoMark: "",
          ctaGradient: "",
          textHeading: "",
          textBody: "",
          fontHeading: "",
          fontBody: "",
        }
      : {}),
  }));
  const [support, setSupport] = useState(config.support);
  const [booking, setBooking] = useState(config.booking);
  const [features, setFeatures] = useState(config.features);
  const [fontError, setFontError] = useState("");
  const [logoError, setLogoError] = useState("");
  const [cropSource, setCropSource] = useState(null);
  const [saveError, setSaveError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const logoFiles = useRef({});
  const fontFile = useRef(null);
  const body = useRef(null);
  const [activeSection, setActiveSection] = useState(section);
  const badPhones = PHONES.filter(([k]) => !validPhone(form[k])).map(
    ([k]) => k,
  );
  const hexOk = /^#[0-9a-f]{6}$/i;
  const preparedBrand = {
    ...form,
    name: form.hospitalName.trim(),
    accent: form.accent || form.primary,
    fontHeading: form.fontHeading || defaultBrand.fontHeading,
    fontBody: form.fontBody || defaultBrand.fontBody,
  };
  const ok =
    validBrand(preparedBrand) &&
    form.hospitalName.trim() &&
    !badPhones.length &&
    validPhone(support.phone);
  const fonts = [
    ...googleFonts.map(([name]) => name),
    ...form.customFonts
      .map((f) => f.name)
      .filter((n) => !googleFonts.some(([g]) => g === n)),
  ];

  // Scroll the panel (not the page) to a section.
  const goTo = (id, behavior = "smooth") => {
    const el = document.getElementById(`edit-${id}`);
    const box = body.current;
    if (!el || !box) return;
    setActiveSection(id);
    if (id === "hospital") {
      box.scrollTo({ top: 0, behavior });
      return;
    }
    const top =
      el.getBoundingClientRect().top -
      box.getBoundingClientRect().top +
      box.scrollTop;
    box.scrollTo({ top: top - 8, behavior });
  };
  useEffect(() => goTo(section, "instant"), [section]);
  useEffect(() => {
    const box = body.current;
    if (!box) return;
    const onScroll = () => {
      const top = box.getBoundingClientRect().top + 80;
      const sections = SECTIONS.map(([id]) =>
        document.getElementById(`edit-${id}`),
      );
      const current = sections
        .filter((node) => node && node.getBoundingClientRect().top <= top)
        .at(-1);
      if (current) setActiveSection(current.id.replace("edit-", ""));
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    // Incomplete fields stay blank in the editor. The preview remains readable
    // without inventing hospital details or saving fallback values.
    previewConfiguration(
      {
        ...form,
        name: form.hospitalName.trim() || "Patient app",
        hospitalName: form.hospitalName.trim() || "Your hospital",
        fontHeading: form.fontHeading || defaultBrand.fontHeading,
        fontBody: form.fontBody || defaultBrand.fontBody,
        primary: /^#[0-9a-f]{6}$/i.test(form.primary)
          ? form.primary
          : defaultBrand.primary,
        accent: /^#[0-9a-f]{6}$/i.test(form.accent)
          ? form.accent
          : defaultBrand.accent,
      },
      {
        ...savedConfig.current,
        support,
        booking,
        features,
      },
    );
  }, [form, support, booking, features, previewConfiguration]);
  useEffect(
    () => () => clearConfigurationPreview(),
    [clearConfigurationPreview],
  );

  return (
    <section className={s.editPanel} aria-label="Edit app configuration">
      {actionHost &&
        createPortal(
          <div className={s.editActions}>
            {saveError && (
              <small className={s.hint} data-error role="alert">
                {saveError}
              </small>
            )}
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              disabled={!ok}
              onClick={() =>
                setSaveError(
                  onSave(
                    { ...brand, ...preparedBrand },
                    { ...config, support, booking, features },
                  ) || "",
                )
              }
            >
              Save changes
            </Button>
          </div>,
          actionHost,
        )}
      <header className={s.editHead}>
        <div className={s.editorTopbar}>
          <div>
            <h2>Edit configuration</h2>
            <p>Preview changes instantly</p>
          </div>
        </div>
        <nav className={s.editNav} aria-label="Sections">
          {SECTIONS.map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              aria-controls={`edit-${id}`}
              aria-current={activeSection === id ? "location" : undefined}
            >
              <span className={s.stepIcon}>
                <Icon name={icon} size={18} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>
      <div className={s.editBody} ref={body}>
        <BrandWebsiteImport
          colours={form}
          onPreviewColours={(patch) =>
            setForm((current) => ({ ...current, ...patch }))
          }
          onUploadMissing={(kind) => {
            goTo("hospital");
            logoFiles.current[kind]?.click();
          }}
          onApply={(patch) => setForm((current) => ({ ...current, ...patch }))}
        />
        <ConfigurationSection id="edit-hospital">
          <div className={s.sectionHeading}>
            <h3>Hospital</h3>
            <p>Your hospital name and brand assets.</p>
          </div>
          <div className={s.grid2}>
            <Field label="Hospital name">
              <input
                className={s.input}
                value={form.hospitalName}
                onChange={set("hospitalName")}
              />
            </Field>
            <Field label="Tagline">
              <input
                className={s.input}
                value={form.tagline}
                onChange={set("tagline")}
              />
            </Field>
          </div>
          <div className={s.field}>
            <span className={s.label}>Brand assets</span>
            <small className={s.hint}>
              Upload each asset separately. SVG recommended. PNG and JPG also
              supported.
            </small>
            <div className={s.brandAssets}>
              {[
                {
                  key: "logoMark",
                  kind: "mark",
                  title: "App icon",
                  shape: "square",
                  hint: "Square · 1:1 · App icon, splash and favicon",
                },
                {
                  key: "logo",
                  kind: "horizontal",
                  title: "Horizontal logo",
                  shape: "wide",
                  hint: "Wide · 4:1 · Headers and sign-in screens",
                },
              ].map((asset) => {
                const uploadAsset =
                  (key, dark = false) =>
                  async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const error = logoFileError(file);
                    setLogoError(error);
                    if (error) return;
                    try {
                      setCropSource({
                        source: await loadLogoSource(file),
                        key,
                        kind: asset.kind,
                        surface: dark ? "dark" : "light",
                      });
                    } catch {
                      setLogoError(
                        "That image could not be read. Choose another SVG, PNG or JPG.",
                      );
                    }
                  };
                const picker = (key, dark = false) => (
                  <input
                    key={key}
                    ref={(input) => {
                      logoFiles.current[key] = input;
                    }}
                    type="file"
                    accept="image/svg+xml,image/png,image/jpeg"
                    aria-label={`${asset.title}${dark ? " dark" : ""} file`}
                    data-testid={`${key}-file`}
                    hidden
                    onChange={uploadAsset(key, dark)}
                  />
                );
                return (
                  <section
                    className={s.brandAsset}
                    key={asset.key}
                    aria-label={asset.title}
                  >
                    <div className={s.brandAssetHead}>
                      <strong>{asset.title}</strong>
                      <small>{asset.hint}</small>
                      {form[asset.key] && (
                        <small>
                          {form[asset.key].startsWith("data:image/svg+xml")
                            ? "SVG vector"
                            : form[asset.key].startsWith("data:image/jpeg")
                              ? "JPG image"
                              : "PNG image"}
                        </small>
                      )}
                    </div>
                    <div className={s.brandAssetPreview}>
                      <span className={s.logoThumb} data-shape={asset.shape}>
                        {form[asset.key] ? (
                          <img src={form[asset.key]} alt={asset.title} />
                        ) : (
                          <Icon name="gallery" size={24} />
                        )}
                      </span>
                    </div>
                    <div className={s.logoRow}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoFiles.current[asset.key]?.click()}
                      >
                        <Icon name="gallery-add" size={16} />
                        {form[asset.key] ? "Replace" : "Upload"}{" "}
                        {asset.title.toLowerCase()}
                      </Button>
                      {form[asset.key] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          theme="error"
                          className={s.removeAsset}
                          aria-label={`Remove ${asset.title.toLowerCase()}`}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              [asset.key]: "",
                            }))
                          }
                        >
                          <Icon name="trash" size={16} /> Remove
                        </Button>
                      )}
                      {picker(asset.key)}
                    </div>
                  </section>
                );
              })}
            </div>
            <small className={s.hint}>
              Adjust zoom, crop, rotation and background before applying.
              Unedited SVGs stay vector; edited images save as PNG. Maximum 5 MB
              per file.
            </small>
            {logoError && (
              <small className={s.hint} data-error role="alert">
                {logoError}
              </small>
            )}
          </div>
          <div className={s.field}>
            <span className={s.label}>Patient previews · display only</span>
            <BrandPreviews brand={form} />
            <small className={s.hint}>
              How patients see your logo. Updates as you edit; save to keep your
              changes.
            </small>
          </div>
          {cropSource && (
            <LogoCropper
              source={cropSource.source}
              kind={cropSource.kind}
              surface={cropSource.surface}
              onCancel={() => setCropSource(null)}
              onApply={(image) => {
                setForm((f) => ({ ...f, [cropSource.key]: image }));
                setCropSource(null);
              }}
            />
          )}
        </ConfigurationSection>

        <ConfigurationSection id="edit-theme">
          <div className={s.sectionHeading}>
            <h3>Theme</h3>
            <p>Colours, buttons and surfaces that feel like your brand.</p>
          </div>
          <div className={s.grid2}>
            <ColorField
              label="Secondary colour"
              hint="Secondary highlights"
              value={form.accent}
              onChange={(accent) => setForm({ ...form, accent })}
              warning={
                !form.accent || hexOk.test(form.accent)
                  ? ""
                  : "Enter a 6-digit hex colour, e.g. #A461D8."
              }
            />
          </div>
          <CtaGradientEditor form={form} onChange={setForm} />
        </ConfigurationSection>

        <ConfigurationSection id="edit-fonts">
          <div className={s.sectionHeading}>
            <h3>Fonts</h3>
            <p>A clear hierarchy for headings and everyday reading.</p>
          </div>
          <div className={s.grid2}>
            {[
              ["fontHeading", "Heading font", "Book a visit", 700],
              [
                "fontBody",
                "Body font",
                "Your lab report is ready to view.",
                400,
              ],
            ].map(([k, label, sample, weight]) => (
              <Field key={k} label={label}>
                <select
                  className={s.input}
                  value={form[k] ? fontFamily(form[k]) : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [k]: e.target.value ? fontStack(e.target.value) : "",
                    })
                  }
                >
                  <option value="">Use default</option>
                  {fonts.map((f) => (
                    <option key={f} value={f}>
                      {f}
                      {form.customFonts.some((c) => c.name === f)
                        ? " (uploaded)"
                        : ""}
                    </option>
                  ))}
                </select>
                <span
                  className={s.fontSample}
                  style={{ fontFamily: form[k], fontWeight: weight }}
                >
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
                      customFonts: form.customFonts.filter(
                        (c) => c.name !== f.name,
                      ),
                      fontHeading:
                        fontFamily(form.fontHeading) === f.name
                          ? brandDefault("heading")
                          : form.fontHeading,
                      fontBody:
                        fontFamily(form.fontBody) === f.name
                          ? brandDefault("body")
                          : form.fontBody,
                    })
                  }
                >
                  <Icon name="close-plain" size={14} />
                </button>
              </span>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fontFile.current?.click()}
            >
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
                const ext = (/\.(woff2?|ttf|otf)$/i.exec(f.name) ||
                  [])[1]?.toLowerCase();
                if (!ext)
                  return setFontError(
                    "Choose a .woff2, .woff, .ttf or .otf file.",
                  );
                try {
                  const data = await readFileAsDataUrl(f, 1.5);
                  const src = `data:font/${ext};base64,${data.split(",")[1]}`;
                  const name = customFontName(f.name);
                  setFontError("");
                  setForm({
                    ...form,
                    customFonts: [
                      ...form.customFonts.filter((c) => c.name !== name),
                      { name, src },
                    ],
                  });
                } catch (err) {
                  setFontError(err.message);
                }
              }}
            />
          </div>
          {fontError ? (
            <small className={s.hint} data-error>
              {fontError}
            </small>
          ) : (
            <small className={s.hint}>
              Upload your brand font (.woff2, .woff, .ttf or .otf, under 1.5
              MB), then choose it above.
            </small>
          )}
        </ConfigurationSection>

        <ConfigurationSection id="edit-contacts">
          <div className={s.sectionHeading}>
            <h3>Contacts</h3>
            <p>Help patients reach the right team.</p>
          </div>
          <div className={s.grid2}>
            {PHONES.map(([k, label, hint, placeholder]) => (
              <Field
                key={k}
                label={label}
                hint={
                  badPhones.includes(k) ? "Enter a valid phone number" : hint
                }
              >
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
            <Field
              label="Patient support phone"
              hint={
                validPhone(support.phone) ? "" : "Enter a valid phone number"
              }
            >
              <input
                className={s.input}
                inputMode="tel"
                value={support.phone}
                onChange={(e) =>
                  setSupport({ ...support, phone: e.target.value })
                }
              />
            </Field>
            <Field label="Patient support email">
              <input
                className={s.input}
                type="email"
                value={support.email}
                onChange={(e) =>
                  setSupport({ ...support, email: e.target.value })
                }
              />
            </Field>
          </div>
          <div className={s.toggleRow}>
            <div>
              <strong>Request a callback</strong>
              <small>
                Patients can ask the front desk to call them back from the app
              </small>
            </div>
            <Toggle
              ariaLabel="Request a callback"
              checked={!!form.callbackEnabled}
              onCheckedChange={(on) =>
                setForm({ ...form, callbackEnabled: on })
              }
            />
          </div>
        </ConfigurationSection>

        <ConfigurationSection id="edit-policies">
          <h3>Appointments</h3>
          <div className={s.grid2}>
            <Field
              label="Cancellation cutoff"
              hint="Patients can't cancel or reschedule within this many hours of the visit"
            >
              <select
                className={s.input}
                value={booking.cancelCutoffHours}
                onChange={(e) =>
                  setBooking({
                    ...booking,
                    cancelCutoffHours: Number(e.target.value),
                  })
                }
              >
                {[0, 1, 2, 4, 12, 24].map((n) => (
                  <option key={n} value={n}>
                    {hoursLabel(n)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Booking window"
              hint="How far ahead patients can book"
            >
              <select
                className={s.input}
                value={booking.windowDays}
                onChange={(e) =>
                  setBooking({ ...booking, windowDays: Number(e.target.value) })
                }
              >
                {[7, 14, 30, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} days
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </ConfigurationSection>

        <ConfigurationSection id="edit-features">
          <div className={s.sectionHeading}>
            <h3>Features</h3>
            <p>Choose the services patients can access.</p>
          </div>
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
                  onCheckedChange={(on) =>
                    setFeatures({ ...features, [key]: on })
                  }
                />
              </div>
            ))}
          </div>
        </ConfigurationSection>
        <InfoNote>
          Changes preview instantly across open app tabs. Save to keep them;
          Cancel restores the saved configuration.
        </InfoNote>
      </div>
    </section>
  );
}

const brandDefault = (kind) =>
  kind === "heading"
    ? "Mulish, system-ui, sans-serif"
    : "Inter, system-ui, sans-serif";
