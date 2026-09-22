import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Checkbox } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import { dateKey, formatDate } from "../services/data";
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
  useAction,
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
      notify(member ? "Profile updated." : "Family member added to the demo.");
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
      <div className={s.familyHero}>
        <div className={s.overlapAvatars}>
          {state.members.slice(0, 4).map((m, i) => (
            <Avatar
              key={m.id}
              name={m.name}
              color={i % 2 ? "violet" : "primary"}
              size={48}
            />
          ))}
        </div>
        <h2>Your people. One place.</h2>
        <p>
          Book visits, keep records and look after
          <br />
          the ones you love.
        </p>
      </div>
      <SectionTitle>{state.members.length} family profiles</SectionTitle>
      <div className={s.stack}>
        {state.members.map((m) => (
          <article
            className={s.familyCard}
            key={m.id}
            data-selected={m.id === activeMember.id}
          >
            <div className={s.doctorRow}>
              <Avatar
                name={m.name}
                size={48}
                color={m.id === activeMember.id ? "primary" : "slate"}
              />
              <div className={s.grow}>
                <h3>
                  <PatientName member={m} />
                </h3>
                <p>
                  {m.relation} · {m.gender}
                </p>
                <small>{m.mrn}</small>
              </div>
              {m.id === activeMember.id ? (
                <Badge size="sm">Active</Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    dispatch({ type: "SELECT_MEMBER", id: m.id });
                    notify(`Now viewing ${m.name.split(" ")[0]}’s care.`);
                  }}
                >
                  Switch
                </Button>
              )}
            </div>
            <div className={s.familyCardFooter}>
              <span>
                <Icon name="shield-tick" size={14} />
                {m.access}
              </span>
              <Button variant="link" size="sm" onClick={() => setEdit(m)}>
                Edit profile
              </Button>
            </div>
          </article>
        ))}
      </div>
      <Notice icon="people">
        The active profile is used for appointments, records, bills and
        vaccination history throughout the app.
      </Notice>
      <Button
        variant="outline"
        fullWidth
        onClick={() => navigate("/emergency")}
      >
        Manage emergency contacts
      </Button>
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
      <PageHeader
        title="My health profile"
        action={
          <Button size="sm" variant="tonal" onClick={() => setEdit(true)}>
            Edit
          </Button>
        }
      />
      <div className={s.profileHero}>
        <PatternAvatar name={activeMember.name} size={88} />
        <h1>
          <PatientName member={activeMember} />
        </h1>
        <p>
          {activeMember.relation} · {activeMember.mrn}
        </p>
        <Badge color="success">{activeMember.access}</Badge>
      </div>
      <div className={s.detailCard}>
        <h3>Personal details</h3>
        <dl>
          <dt>Date of birth</dt>
          <dd>{formatDate(activeMember.dob, { year: "numeric" })}</dd>
          <dt>Gender</dt>
          <dd>{activeMember.gender}</dd>
          <dt>Blood group</dt>
          <dd>{activeMember.blood || "Not added"}</dd>
          <dt>Mobile</dt>
          <dd>+91 {activeMember.phone}</dd>
          <dt>Allergies</dt>
          <dd>{activeMember.allergies || "Not provided"}</dd>
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
          icon="call-calling"
          title="Emergency contacts"
          subtitle="The people we can reach when it matters"
          onClick={() => navigate("/emergency")}
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
