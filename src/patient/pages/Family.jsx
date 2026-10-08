import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Checkbox } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import { dateKey, formatDate } from "../../shared/data";
import {
  Button,
  PatientName,
  Avatar,
  PatternAvatar,
  Badge,
  Icon,
  PageHeader,
  SectionTitle,
  Field,
  ChoiceGroup,
  Sheet,
  Notice,
  ErrorText,
  Row,
  BrandLogo,
  Status,
  useAction,
  IconButton,
} from "../components/ui";
import s from "../App.module.css";
export function MemberForm({ member, onClose, onSave }) {
  const { dispatch, notify } = useApp();
  const [values, setValues] = useState(
    member || {
      name: "",
      relation: "Father",
      dob: "",
      gender: "Male",
      phone: "",
      blood: "",
      allergies: "",
    },
  );
  const [consent, setConsent] = useState(!!member);
  const { busy, error, run } = useAction();
  const field = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  function submit(e) {
    e.preventDefault();
    run(() => {
      if (!consent)
        throw new Error("Confirm permission to manage this family profile.");
      const profile = {
        ...values,
        name: values.name.trim(),
        id: member?.id || crypto.randomUUID(),
        mrn: member?.mrn || `TP-${Math.floor(10000 + Math.random() * 89999)}`,
        access: "Full access",
        demoConsent: true,
      };
      dispatch({ type: "SAVE_MEMBER", member: profile });
      notify(member ? "Profile updated." : "Family member added.");
      onSave?.(profile);
      onClose();
    });
  }
  return (
    <form className={s.stack} onSubmit={submit}>
      <Field
        label="Full name"
        required
        maxLength={80}
        value={values.name}
        onChange={(e) => field("name", e.target.value)}
      />
      {values.relation !== "Self" && (
        <ChoiceGroup
          label="Relationship"
          options={["Father", "Mother", "Spouse", "Child", "Sibling", "Other"]}
          value={values.relation}
          onChange={(v) => field("relation", v)}
        />
      )}
      <div className={s.twoColumns}>
        <Field
          label="Date of birth"
          type="date"
          required
          max={dateKey()}
          value={values.dob}
          onChange={(e) => field("dob", e.target.value)}
        />
        <Field
          label="Blood group (optional)"
          placeholder="e.g. B+"
          maxLength={5}
          value={values.blood}
          onChange={(e) => field("blood", e.target.value)}
        />
      </div>
      <ChoiceGroup
        label="Gender"
        options={["Male", "Female", "Other", "Prefer not to say"]}
        value={values.gender}
        onChange={(v) => field("gender", v)}
      />
      <Field
        label="Mobile number"
        leftAddon="+91"
        inputMode="numeric"
        required
        pattern="[6-9][0-9]{9}"
        maxLength={10}
        value={values.phone}
        onChange={(e) => field("phone", e.target.value.replace(/\D/g, ""))}
      />
      <Field
        label="Known allergies (optional)"
        value={values.allergies}
        onChange={(e) => field("allergies", e.target.value)}
      />
      {!member && (
        <>
          <Checkbox
            checked={consent}
            onCheckedChange={setConsent}
            label="I have permission to manage this person’s care, or I am their legal guardian."
          />
          <Notice>
            Demo consent only. Live family access requires verified consent or
            guardianship before any existing records can be shared.
          </Notice>
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} fullWidth>
        {member ? "Save changes" : "Add family member"}
      </Button>
    </form>
  );
}
export default function Family() {
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [edit, setEdit] = useState(null);
  const open = params.get("add") === "1";
  return (
    <div className={s.page}>
      <PageHeader
        title="Your family"
        action={
          <Button size="sm" onClick={() => setParams({ add: "1" })}>
            <Icon name="add" />
            Add members
          </Button>
        }
      />
      <div className={s.familyIntro}>
        <SectionTitle>{state.members.length} family profiles</SectionTitle>
        <p className={s.bodyText}>
          Book visits, keep records and look after the ones you love.
        </p>
      </div>
      <div className={s.stack}>
        {/* Active profile first; the rest follow in their saved order. */}
        {[...state.members]
          .sort(
            (a, b) => (b.id === activeMember.id) - (a.id === activeMember.id),
          )
          .map((m) => {
            const active = m.id === activeMember.id;
            return (
              <article
                className={s.familyCard}
                key={m.id}
                data-selected={active}
              >
                <div className={s.familyMember}>
                  <Avatar
                    name={m.name}
                    size={48}
                    color={active ? "primary" : "slate"}
                  />
                  <div className={s.grow}>
                    <h3 className={s.cardTitle}>
                      <PatientName member={m} />
                    </h3>
                    <span className={s.metaText}>
                      {m.relation} · {m.gender} · {m.mrn}
                    </span>
                    <span className={s.familyBadges}>
                      {active && (
                        <Badge variant="soft" color="primary" size="sm">
                          Active
                        </Badge>
                      )}
                      <Status status={m.access} />
                    </span>
                  </div>
                  <div className={s.familyActions}>
                    {!active && (
                      <button
                        type="button"
                        className={s.familyAction}
                        data-tone="primary"
                        aria-label={`Switch to ${m.name}`}
                        title="Switch"
                        onClick={() => {
                          dispatch({ type: "SELECT_MEMBER", id: m.id });
                          notify(`Now viewing ${m.name.split(" ")[0]}’s care.`);
                        }}
                      >
                        <Icon name="repeat-arrow" family="arrow" size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={s.familyAction}
                      aria-label={`Edit ${m.name}’s profile`}
                      title="Edit profile"
                      onClick={() => setEdit(m)}
                    >
                      <Icon name="edit" size={18} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
      <Notice icon="people">
        The active profile is used for appointments, records, bills and
        vaccination history throughout the app.
      </Notice>
      <Sheet
        open={open || !!edit}
        onClose={() => {
          setParams({});
          setEdit(null);
        }}
        title={edit ? "Edit family profile" : "Add a family member"}
      >
        {(open || edit) && (
          <MemberForm
            key={edit?.id || "new"}
            member={edit}
            onClose={() => {
              setParams({});
              setEdit(null);
            }}
          />
        )}
      </Sheet>
    </div>
  );
}
export function Profile() {
  const { activeMember, brand } = useApp();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  return (
    <div className={s.page}>
      <PageHeader title="My health profile" />
      <div className={s.profileHero}>
        <PatternAvatar name={activeMember.name} size={64} />
        <div className={s.grow}>
          <h2>
            <PatientName member={activeMember} />
          </h2>
          <span className={s.profileMeta}>
            <span className={s.metaText}>
              {activeMember.relation} · {activeMember.mrn}
            </span>
            <Status status={activeMember.access} />
          </span>
        </div>
      </div>
      <div className={s.detailCard}>
        <div className={s.cardTitleRow}>
          <h3 className={s.cardTitle}>Personal details</h3>
          <IconButton
            name="edit"
            label="Edit personal details"
            iconSize={18}
            onClick={() => setEdit(true)}
          />
        </div>
        <dl>
          <dt>Date of birth</dt>
          <dd>{formatDate(activeMember.dob, { year: "numeric" })}</dd>
          <dt>Gender</dt>
          <dd>{activeMember.gender}</dd>
          <dt>Blood group</dt>
          <dd>{activeMember.blood || "Not added"}</dd>
          <dt>Mobile</dt>
          <dd>+91 {activeMember.phone}</dd>
        </dl>
      </div>
      <div className={s.rowCard}>
        <Row
          icon="shield-tick"
          title="Link UHID / ABHA"
          subtitle="Connect hospital and health identities"
          onClick={() => navigate("/link-records")}
        />
        <Row
          icon="people"
          title="Family profiles"
          subtitle="Manage care for someone you love"
          onClick={() => navigate("/family")}
        />
      </div>
      <div className={s.homeFooter}>
        <BrandLogo symbol />
        <small>{brand.hospitalName}</small>
      </div>
      <Sheet
        open={edit}
        onClose={() => setEdit(false)}
        title="Edit your profile"
      >
        {edit && (
          <MemberForm member={activeMember} onClose={() => setEdit(false)} />
        )}
      </Sheet>
    </div>
  );
}
