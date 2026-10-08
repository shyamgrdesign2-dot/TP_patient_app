import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toggle, ConfirmDialog } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import {
  defaultBrand,
  brandPresets,
  validBrand,
  whiteTextContrast,
} from "../../shared/brand";
import { getCredentialType, saveDemoCredential } from "../services/demoAuth";
import { packagesEnabled } from "../../shared/catalog";
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
  NotificationItem,
  useAction,
} from "../components/ui";
import s from "../App.module.css";
export function More() {
  const { activeMember, brand, signOut } = useApp();
  const navigate = useNavigate();
  const groups = [
    [
      "Your account",
      [
        ["people", "Manage family", "/family"],
        ["bill", "Bills & receipts", "/billing"],
        ...(packagesEnabled()
          ? [
              ["health", "Health packages & vaccines", "/packages"],
              ["calendar-tick", "My bookings", "/packages?tab=bookings"],
            ]
          : []),
        ["link", "Link UHID / ABHA", "/link-records"],
        ["location", "Hospital & directions", "/hospital"],
      ],
    ],
    [
      "Help & preferences",
      [
        ["message-text", "Share feedback", "/feedback"],
        ["setting-2", "Settings & privacy", "/settings"],
      ],
    ],
  ];
  return (
    <div className={s.page}>
      <PageHeader title="More" />
      <button className={s.profileSummary} onClick={() => navigate("/profile")}>
        <PatternAvatar name={activeMember.name} size={48} />
        <span className={s.grow}>
          <h2 className={s.cardTitle}>
            <PatientName member={activeMember} />
          </h2>
          <span className={s.metaText}>
            {activeMember.relation} · {activeMember.mrn}
          </span>
          <span className={s.inlineLink}>View health profile</span>
        </span>
        <Icon
          name="chevron-right"
          size={16}
          color="var(--tesseract-fg-tertiary)"
        />
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
        <small>Patient experience · v0.1</small>
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
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className={s.page}>
      <PageHeader title="Your updates" />
      <MemberContext />
      {notifications.length ? (
        <section>
          <SectionTitle
            action={unread ? "Read all" : undefined}
            onAction={() => dispatch({ type: "READ_NOTICE", id: "all" })}
          >
            {unread ? `${unread} unread` : "All caught up"}
          </SectionTitle>
          <div className={s.notificationList}>
            {notifications.map((n) => (
              <NotificationItem
                key={n.id}
                notice={n}
                onOpen={() => {
                  dispatch({ type: "READ_NOTICE", id: n.id });
                  navigate(n.route);
                }}
              />
            ))}
          </div>
        </section>
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
          Delete my account
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
        Reset app data
      </Button>
      <Button
        variant="ghost"
        theme="error"
        onClick={() => {
          signOut();
          navigate("/login");
        }}
      >
        Sign out
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
              notify(`${type} saved.`);
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
        title="Reset app data?"
        description="Bookings, profiles and bills will return to their original state. Uploaded files will also be removed."
        primaryLabel="Keep my changes"
        onPrimary={() => setReset(false)}
        secondaryLabel="Reset"
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
              notify("Emergency contact saved.");
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
          <p>Thank you. Your feedback was saved.</p>
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
        </form>
      )}
    </div>
  );
}
