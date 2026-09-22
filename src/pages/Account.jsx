import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toggle, ConfirmDialog } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import {
  defaultBrand,
  brandPresets,
  validBrand,
  whiteTextContrast,
} from "../config/brand";
import { getCredentialType, saveDemoCredential } from "../services/demoAuth";
import {
  Button,
  PatientName,
  Badge,
  Avatar,
  PatternAvatar,
  Icon,
  PageHeader,
  SectionTitle,
  MemberContext,
  Field,
  ChoiceGroup,
  Empty,
  Sheet,
  Notice,
  ErrorText,
  Row,
  BrandLogo,
  useAction,
} from "../components/ui";
import s from "../App.module.css";
export function More() {
  const { activeMember, brand, signOut } = useApp();
  const navigate = useNavigate();
  const groups = [
    [
      "YOUR CARE",
      [
        ["health", "Find a doctor", "/doctors"],
        ["hospital", "Hospital stays", "/inpatient"],
        ["shield-tick", "Vaccinations", "/vaccines"],
        ["home-2", "Home care", "/home-care"],
        ["gift", "Health check packages", "/packages"],
      ],
    ],
    [
      "YOUR ACCOUNT",
      [
        ["people", "Manage family", "/family"],
        ["bill", "Bills & payment history", "/billing"],
        ["link", "Link UHID / ABHA", "/link-records"],
        ["call-calling", "Emergency contacts", "/emergency"],
        ["location", "Hospital & directions", "/hospital"],
      ],
    ],
    [
      "HELP & PREFERENCES",
      [
        ["message-text", "Share feedback", "/feedback"],
        ["setting-2", "Settings & privacy", "/settings"],
      ],
    ],
  ];
  return (
    <div className={s.page}>
      <PageHeader title="A little more care" />
      <button className={s.profileSummary} onClick={() => navigate("/profile")}>
        <PatternAvatar name={activeMember.name} size={64} />
        <span className={s.grow}>
          <h2>
            <PatientName member={activeMember} />
          </h2>
          <small>
            {activeMember.mrn} · {activeMember.relation}
          </small>
          <span className={s.inlineLink}>View health profile</span>
        </span>
        <Icon name="chevron-right" />
      </button>
      {groups.map(([label, rows]) => (
        <section key={label}>
          <SectionTitle>{label}</SectionTitle>
          <div className={s.rowCard}>
            {rows.map(([icon, title, path]) => (
              <Row
                key={path}
                title={title}
                icon={icon}
                onClick={() => navigate(path)}
              />
            ))}
          </div>
        </section>
      ))}
      <Button
        variant="ghost"
        theme="error"
        fullWidth
        onClick={() => {
          signOut();
          navigate("/login");
        }}
      >
        <Icon name="logout" />
        Sign out
      </Button>
      <div className={s.homeFooter}>
        <BrandLogo />
        <p>{brand.tagline}</p>
        <small>Patient experience · v0.1 · Demo</small>
        <Button variant="link" size="sm" onClick={() => navigate("/branding")}>
          Preview hospital branding
        </Button>
      </div>
    </div>
  );
}
export function Notifications() {
  const { state, activeMember, dispatch } = useApp();
  const navigate = useNavigate();
  const notifications = state.notifications.filter(
    (n) => !n.memberId || n.memberId === activeMember.id,
  );
  return (
    <div className={s.page}>
      <PageHeader
        title="Your updates"
        action={
          <Button
            variant="link"
            size="sm"
            onClick={() => dispatch({ type: "READ_NOTICE", id: "all" })}
          >
            Read all
          </Button>
        }
      />
      <MemberContext />
      {notifications.length ? (
        notifications.map((n) => (
          <button
            className={s.notificationCard}
            key={n.id}
            data-unread={!n.read}
            onClick={() => {
              dispatch({ type: "READ_NOTICE", id: n.id });
              navigate(n.route);
            }}
          >
            <span className={s.rowIcon}>
              <Icon name={n.icon} bulk />
            </span>
            <span className={s.grow}>
              <strong>{n.title}</strong>
              <p>{n.body}</p>
              <small>{n.date}</small>
            </span>
            {!n.read && <span className={s.newDot} />}
          </button>
        ))
      ) : (
        <Empty
          icon="notification-2"
          title="You’re all caught up"
          description="Appointment reminders and hospital updates will appear here."
        />
      )}
    </div>
  );
}
export function Settings() {
  const { state, dispatch, notify, resetDemo, signOut, deleteAccount } =
    useApp();
  const navigate = useNavigate();
  const [security, setSecurity] = useState(false);
  const [type, setType] = useState("PIN");
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reset, setReset] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const { busy, error, run } = useAction();
  return (
    <div className={s.page}>
      <PageHeader title="Settings & privacy" />
      <SectionTitle>Make it yours</SectionTitle>
      <div className={s.rowCard}>
        <Row
          icon="profile"
          title="Personal information"
          subtitle="Your profile and medical details"
          onClick={() => navigate("/profile")}
        />
        <Row
          icon="lock"
          title="Quick access"
          subtitle={
            getCredentialType()
              ? `Demo ${getCredentialType()} is set`
              : "Set a quick PIN or password"
          }
          onClick={() => setSecurity(true)}
        />
        <Row
          icon="color-swatch"
          title="Hospital branding preview"
          subtitle="Logo, brand colours and typography"
          onClick={() => navigate("/branding")}
        />
      </div>
      <SectionTitle>Notifications</SectionTitle>
      <div className={s.detailCard}>
        {[
          [
            "reminders",
            "Appointment reminders",
            "Updates about your upcoming visits",
          ],
          [
            "reports",
            "Health record updates",
            "Know when new reports are available",
          ],
          [
            "promotions",
            "Hospital news & offers",
            "Optional wellness and package updates",
          ],
        ].map(([key, title, description]) => (
          <div className={s.settingRow} key={key}>
            <div>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
            <Toggle
              ariaLabel={title}
              checked={state.preferences[key]}
              onCheckedChange={(v) =>
                dispatch({ type: "PREFERENCE", key, value: v })
              }
            />
          </div>
        ))}
      </div>
      <Notice>
        These are demo preferences. Device push notifications will be enabled
        after the hospital’s notification service is connected.
      </Notice>
      <SectionTitle>Your privacy</SectionTitle>
      <div className={s.detailCard}>
        <h3>You’re in control of your care.</h3>
        <p>
          Family access and ABHA sharing should always be based on your consent.
          In this preview, sample data and uploaded files stay in your browser.
        </p>
        <p>
          Live account deletion, data export and consent history require the
          patient service. Contact your hospital for help with real records.
        </p>
      </div>
      <Button theme="error" variant="ghost" onClick={() => setDeleting(true)}>
        Delete account
      </Button>
      <Sheet
        open={deleting}
        onClose={() => {
          if (!busy) setDeleting(false);
        }}
        title="Delete your account?"
      >
        <p>
          This removes your local demo profile, family profiles, bookings,
          linked identities, saved access code and uploaded files from this
          browser. This cannot be undone.
        </p>
        <Notice>
          This preview cannot delete records held by your hospital. Contact the
          hospital for live account or record deletion.
        </Notice>
        <label className={s.consentLabel}>
          <input
            type="checkbox"
            checked={deleteConfirmed}
            onChange={(event) => setDeleteConfirmed(event.target.checked)}
          />
          I understand that my local demo data will be permanently deleted.
        </label>
        <ErrorText>{error}</ErrorText>
        <Button
          theme="error"
          fullWidth
          disabled={!deleteConfirmed}
          loading={busy}
          onClick={() =>
            run(async () => {
              await deleteAccount();
              setDeleting(false);
              navigate("/login", { replace: true });
            })
          }
        >
          Delete my demo account
        </Button>
        <Button
          variant="ghost"
          fullWidth
          disabled={busy}
          onClick={() => setDeleting(false)}
        >
          Keep my account
        </Button>
      </Sheet>
      <Button variant="outline" onClick={() => setReset(true)}>
        Reset sample data
      </Button>
      <Button
        variant="ghost"
        theme="error"
        onClick={() => {
          signOut();
          navigate("/login");
        }}
      >
        Sign out of demo
      </Button>
      <Sheet
        open={security}
        onClose={() => setSecurity(false)}
        title="Set up quick access"
      >
        <ChoiceGroup
          label="Choose an access method"
          options={["PIN", "Password"]}
          value={type}
          onChange={(v) => {
            setType(v);
            setValue("");
            setConfirm("");
          }}
        />
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              if (type === "PIN" && !/^\d{6}$/.test(value))
                throw new Error("Use a 6-digit PIN.");
              if (type === "Password" && value.length < 10)
                throw new Error("Use a password with at least 10 characters.");
              if (value !== confirm)
                throw new Error("The confirmation does not match.");
              await saveDemoCredential(value, type);
              setSecurity(false);
              setValue("");
              setConfirm("");
              notify(`Demo ${type.toLowerCase()} saved.`);
            });
          }}
        >
          <Field
            label={type === "PIN" ? "6-digit PIN" : "Password"}
            type="password"
            inputMode={type === "PIN" ? "numeric" : undefined}
            maxLength={type === "PIN" ? 6 : 100}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Field
            label={`Confirm ${type.toLowerCase()}`}
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Notice>
            Local demo access only. Live app unlock will use device secure
            storage and a server-issued session.
          </Notice>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" loading={busy}>
            Save {type.toLowerCase()}
          </Button>
        </form>
      </Sheet>
      <ConfirmDialog
        open={reset}
        onOpenChange={setReset}
        title="Reset this demo?"
        description="Sample bookings, profiles and payments will return to their original state. Uploaded demo files will also be removed."
        primaryLabel="Keep my changes"
        onPrimary={() => setReset(false)}
        secondaryLabel="Reset demo"
        secondaryTone="destructive"
        onSecondary={() => {
          resetDemo();
          indexedDB.deleteDatabase("tatva-demo-files");
          setReset(false);
          navigate("/");
        }}
      />
    </div>
  );
}
export function Branding() {
  const { brand, setBrand, notify } = useApp();
  const [draft, setDraft] = useState(brand);
  const { error, run } = useAction();
  function set(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  async function uploadLogo(file) {
    if (!file) return;
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
        throw new Error("Use a PNG, JPG or WebP logo.");
      if (file.size > 500000) throw new Error("Choose a logo under 500 KB.");
      const reader = new FileReader();
      reader.onload = () => set("logo", reader.result);
      reader.readAsDataURL(file);
    } catch (e) {
      notify(e.message, true);
    }
  }
  return (
    <div className={s.page}>
      <PageHeader title="Make it your hospital" />
      <Notice>
        Brand studio · Preview configuration for hospital administrators.
      </Notice>
      <SectionTitle>Start with a theme</SectionTitle>
      <div className={s.brandPresets}>
        {brandPresets.map((p) => (
          <button
            key={p.name}
            data-selected={draft.name === p.name}
            onClick={() => {
              setDraft(p);
              setBrand(p);
            }}
          >
            <span style={{ background: p.primary }} />
            <strong>{p.label}</strong>
            <small>Apply theme</small>
          </button>
        ))}
      </div>
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          run(() => {
            if (!validBrand(draft))
              throw new Error("Enter a name and valid 6-digit hex colours.");
            if (whiteTextContrast(draft.primary) < 4.5)
              throw new Error(
                "Choose a darker primary colour so button labels remain readable.",
              );
            if (!draft.hospitalName.trim())
              throw new Error("Enter a hospital name.");
            setBrand({ ...draft, name: draft.name.trim() });
            notify("Hospital branding applied everywhere.");
          });
        }}
      >
        <SectionTitle>Your identity</SectionTitle>
        <Field
          label="App name"
          required
          maxLength={40}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Field
          label="Hospital name"
          required
          maxLength={60}
          value={draft.hospitalName}
          onChange={(e) => set("hospitalName", e.target.value)}
        />
        <Field
          label="Tagline"
          maxLength={100}
          value={draft.tagline}
          onChange={(e) => set("tagline", e.target.value)}
        />
        <label className={s.uploadZone}>
          <Icon name="gallery-add" size={28} />
          {draft.logo ? (
            <img
              className={s.brandImage}
              src={draft.logo}
              alt="Custom logo preview"
            />
          ) : (
            <strong>Upload your hospital logo</strong>
          )}
          <small>PNG, JPG or WebP · Up to 500 KB</small>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Hospital logo"
            onChange={(e) => uploadLogo(e.target.files[0])}
          />
        </label>
        {draft.logo && (
          <Button variant="link" onClick={() => set("logo", "")}>
            Remove logo
          </Button>
        )}
        <div className={s.twoColumns}>
          <Field
            label="Primary colour"
            value={draft.primary}
            onChange={(e) => set("primary", e.target.value)}
            leftIcon={
              <span
                className={s.colourDot}
                style={{ background: draft.primary }}
              />
            }
          />
          <Field
            label="Accent colour"
            value={draft.accent}
            onChange={(e) => set("accent", e.target.value)}
            leftIcon={
              <span
                className={s.colourDot}
                style={{ background: draft.accent }}
              />
            }
          />
        </div>
        <Field
          label="Hospital emergency number"
          type="tel"
          value={draft.emergencyPhone || ""}
          placeholder="Hospital-provided phone number"
          onChange={(e) => set("emergencyPhone", e.target.value)}
        />
        <Field
          label="Hospital ambulance number"
          type="tel"
          value={draft.ambulancePhone || ""}
          placeholder="Hospital-provided phone number"
          onChange={(e) => set("ambulancePhone", e.target.value)}
        />
        <ChoiceGroup
          label="Font family"
          options={["Inter", "Mulish", "System"]}
          value={
            draft.fontBody.startsWith("Inter")
              ? "Inter"
              : draft.fontBody.startsWith("Mulish")
                ? "Mulish"
                : "System"
          }
          onChange={(v) => {
            set(
              "fontBody",
              v === "System"
                ? "system-ui, sans-serif"
                : `${v}, system-ui, sans-serif`,
            );
            set(
              "fontHeading",
              v === "System"
                ? "system-ui, sans-serif"
                : `${v}, system-ui, sans-serif`,
            );
          }}
        />
        <ErrorText>{error}</ErrorText>
        <Button type="submit" fullWidth>
          Apply hospital branding
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setDraft(defaultBrand);
            setBrand(defaultBrand);
            notify("Tatva Practice branding restored.");
          }}
        >
          Restore Tatva Practice
        </Button>
      </form>
      <p className={s.footnote}>
        Logo, colours and fonts apply to all screens through the shared
        Tesseract theme.
      </p>
    </div>
  );
}
export function Emergency() {
  const { state, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("Family");
  const { error, run } = useAction();
  return (
    <div className={s.page}>
      <PageHeader title="Emergency contacts" />
      <Notice tone="warning" icon="call-calling">
        For an emergency in India, call 112. Do not wait for an in-app response.
      </Notice>
      <Button href="tel:112" theme="error" fullWidth>
        <Icon name="call" />
        Call emergency assistance · 112
      </Button>
      <SectionTitle action="Add contact" onAction={() => setOpen(true)}>
        People you can count on
      </SectionTitle>
      <div className={s.stack}>
        {state.contacts.map((c) => (
          <div className={s.detailCard} key={c.id}>
            <div className={s.doctorRow}>
              <Avatar name={c.name} size={44} />
              <div>
                <h3>{c.name}</h3>
                <p>{c.relation}</p>
                <small>+91 {c.phone}</small>
              </div>
            </div>
            <Badge color="neutral" size="sm">
              Demo contact
            </Badge>
          </div>
        ))}
      </div>
      <Button variant="outline" onClick={() => navigate("/hospital")}>
        Hospital & ambulance contacts
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Add an emergency contact"
      >
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => {
              if (!name.trim() || !/^[6-9]\d{9}$/.test(phone))
                throw new Error("Enter a name and valid mobile number.");
              dispatch({
                type: "CONTACT",
                contact: {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  relation,
                  phone,
                },
              });
              setOpen(false);
              setName("");
              setPhone("");
              notify("Demo emergency contact saved.");
            });
          }}
        >
          <Field
            label="Full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Field
            label="Relationship"
            required
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          />
          <Field
            label="Mobile number"
            leftAddon="+91"
            inputMode="numeric"
            required
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit">Save contact</Button>
        </form>
      </Sheet>
    </div>
  );
}
export function Feedback() {
  const { dispatch, notify } = useApp();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const { error, run } = useAction();
  return (
    <div className={s.page}>
      <PageHeader title="We’re listening" />
      {done ? (
        <div className={s.successHero}>
          <Icon name="heart" size={56} bulk />
          <h1>
            Thank you for
            <br />
            sharing your experience.
          </h1>
          <p>Your feedback was saved in this demo.</p>
          <Button
            variant="tonal"
            onClick={() => {
              setDone(false);
              setRating(0);
              setText("");
            }}
          >
            Share more feedback
          </Button>
        </div>
      ) : (
        <form
          className={s.stack}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => {
              if (!rating) throw new Error("Please select a rating.");
              dispatch({
                type: "FEEDBACK",
                feedback: {
                  id: crypto.randomUUID(),
                  rating,
                  message: text,
                  createdAt: new Date().toISOString(),
                },
              });
              setDone(true);
              notify("Feedback saved locally.");
            });
          }}
        >
          <div className={s.feedbackHero}>
            <Icon name="message-favorite" size={48} bulk />
            <h2>How was your experience?</h2>
            <div className={s.starButtons}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant="ghost"
                  aria-label={`Rate ${n} out of 5`}
                  aria-pressed={rating >= n}
                  onClick={() => setRating(n)}
                >
                  <Icon name="star" size={32} bulk={rating >= n} />
                </Button>
              ))}
            </div>
          </div>
          <Field
            label="Anything you’d like us to know?"
            autoGrow
            maxLength={1000}
            placeholder="Tell us what went well or what we can improve."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <ErrorText>{error}</ErrorText>
          <Button type="submit">Save feedback</Button>
          <p className={s.footnote}>Demo feedback is not sent to a hospital.</p>
        </form>
      )}
    </div>
  );
}
