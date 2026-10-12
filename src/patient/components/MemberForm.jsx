import { useState } from "react";
import { Checkbox, Dropdown } from "@dhspl-tatvacare/tesseract-ui";
import SegmentedControl from "./SegmentedControl";
import { useApp } from "../state/AppContext";
import { dateKey } from "../../shared/data";
import {
  GENDERS,
  RELATIONS,
  MAX_AGE_YEARS,
  ageParts,
  dobFromAge,
  profileProblem,
} from "../../shared/age";
import { Button, Field, ChoiceGroup, ErrorText, useAction } from "./ui";
import s from "../App.module.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const digits = (value, length) => value.replace(/\D/g, "").slice(0, length);

// A field label in the form's own style, with the required mark.
export function RequiredLabel({ children }) {
  return (
    <span className={s.formLabel}>
      {children}
      <span className={s.requiredMark} aria-hidden="true">
        *
      </span>
    </span>
  );
}
// Date of birth or age: the two answer the same question, so the patient
// gives whichever they know (as on Tatva Practice's create-patient form).
// `value` is { mode: "dob" | "age", dob, years, months }.
export function birthValue(member) {
  const age = member?.dobFromAge ? ageParts(member.dob) : null;
  return {
    mode: age ? "age" : "dob",
    dob: age ? "" : member?.dob || "",
    years: age ? String(age.years) : "",
    months: age?.months ? String(age.months) : "",
  };
}
// The date of birth to store, plus whether it was derived from an age.
export function resolveBirth(value) {
  if (value.mode === "dob") return { dob: value.dob, dobFromAge: false };
  if (value.years === "" && value.months === "")
    return { dob: "", dobFromAge: true };
  return { dob: dobFromAge(value.years, value.months), dobFromAge: true };
}
export function BirthField({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className={s.fieldGroup}>
      <div className={s.birthHead}>
        <RequiredLabel>
          {value.mode === "age" ? "Age" : "Date of birth"}
        </RequiredLabel>
        <SegmentedControl
          aria-label="Enter date of birth or age"
          size="md"
          fullWidth
          radius={10}
          options={[
            { value: "dob", label: "Date of birth" },
            { value: "age", label: "Age" },
          ]}
          value={value.mode}
          onValueChange={(mode) => set({ mode })}
        />
      </div>
      {value.mode === "dob" ? (
        <Field
          label={undefined}
          aria-label="Date of birth"
          type="date"
          autoComplete="bday"
          max={dateKey()}
          value={value.dob}
          onChange={(e) => set({ dob: e.target.value })}
        />
      ) : (
        <div className={s.agePair}>
          <Field
            label={undefined}
            aria-label="Age in years"
            placeholder="Years"
            unit="yrs"
            inputMode="numeric"
            maxLength={3}
            value={value.years}
            onChange={(e) => {
              const years = digits(e.target.value, 3);
              if (Number(years || 0) <= MAX_AGE_YEARS) set({ years });
            }}
          />
          <Field
            label={undefined}
            aria-label="Age in months"
            placeholder="Months"
            unit="mos"
            inputMode="numeric"
            maxLength={2}
            value={value.months}
            onChange={(e) => {
              const months = digits(e.target.value, 2);
              if (Number(months || 0) <= 11) set({ months });
            }}
          />
        </div>
      )}
      <small className={s.fieldHint}>
        {value.mode === "dob"
          ? "Not sure of the exact date? Enter an age instead."
          : "Add months for a child under two."}
      </small>
    </div>
  );
}

export function MemberForm({ member, onClose, onSave }) {
  const { dispatch, notify } = useApp();
  const self = member?.relation === "Self";
  const listed = !member || RELATIONS.includes(member.relation);
  const [values, setValues] = useState({
    name: member?.name || "",
    relation: self ? "Self" : listed ? member?.relation || "" : "Other",
    customRelation: !self && !listed ? member.relation : "",
    gender: GENDERS.includes(member?.gender) ? member.gender : "",
    phone: member?.phone || "",
    blood: member?.blood || "",
  });
  const [birth, setBirth] = useState(() => birthValue(member));
  const [consent, setConsent] = useState(!!member);
  const { busy, error, run } = useAction();
  const field = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  function submit(e) {
    e.preventDefault();
    run(() => {
      const { customRelation, ...rest } = values;
      const relation =
        values.relation === "Other" ? customRelation.trim() : values.relation;
      if (values.relation === "Other" && !relation)
        throw new Error("Enter the relationship.");
      const profile = {
        ...member,
        ...rest,
        ...resolveBirth(birth),
        relation,
        name: values.name.trim(),
        id: member?.id || crypto.randomUUID(),
        mrn: member?.mrn || `TP-${Math.floor(10000 + Math.random() * 89999)}`,
        access: member?.access || "Full access",
      };
      delete profile.allergies;
      delete profile.demoConsent;
      const problem = profileProblem(profile, { relation: !self });
      if (problem) throw new Error(problem);
      if (!consent)
        throw new Error("Confirm you have permission to manage this profile.");
      dispatch({ type: "SAVE_MEMBER", member: profile });
      notify(member ? "Profile updated." : "Family member added.");
      onSave?.(profile);
      onClose();
    });
  }
  return (
    <form className={s.stack} onSubmit={submit} noValidate>
      <Field
        label="Full name"
        required
        autoComplete="off"
        maxLength={80}
        value={values.name}
        onChange={(e) => field("name", e.target.value)}
      />
      {!self && (
        <div className={s.fieldGroup}>
          <Dropdown
            className={s.select}
            label={
              <>
                Relationship
                <span className={s.requiredMark} aria-hidden="true">
                  *
                </span>
              </>
            }
            ariaLabel="Relationship"
            placeholder="Select relationship"
            options={RELATIONS.map((r) => ({ value: r, label: r }))}
            value={values.relation || undefined}
            onChange={(v) => field("relation", v)}
            maxMenuHeight={260}
          />
          {values.relation === "Other" && (
            <Field
              label={undefined}
              aria-label="Relationship (other)"
              placeholder="e.g. Uncle, Cousin, Friend"
              maxLength={30}
              value={values.customRelation}
              onChange={(e) => field("customRelation", e.target.value)}
            />
          )}
        </div>
      )}
      <BirthField value={birth} onChange={setBirth} />
      <ChoiceGroup
        label={<RequiredLabel>Gender</RequiredLabel>}
        ariaLabel="Gender"
        options={GENDERS}
        value={values.gender}
        onChange={(v) => field("gender", v)}
      />
      <Field
        label="Mobile number"
        leftAddon="+91"
        type="tel"
        inputMode="numeric"
        required
        maxLength={10}
        value={values.phone}
        onChange={(e) => field("phone", digits(e.target.value, 10))}
      />
      <Dropdown
        className={s.select}
        label="Blood group (optional)"
        ariaLabel="Blood group (optional)"
        placeholder="Select blood group"
        options={[
          { value: "not-provided", label: "Not provided" },
          ...BLOOD_GROUPS.map((b) => ({ value: b, label: b })),
        ]}
        value={values.blood || "not-provided"}
        onChange={(v) => field("blood", v === "not-provided" ? "" : v)}
        clearable={false}
        placement="top"
        maxMenuHeight={220}
      />
      {!member && (
        <Checkbox
          checked={consent}
          onCheckedChange={setConsent}
          label="I have this person’s permission to manage their care."
        />
      )}
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={busy} fullWidth>
        {member ? "Save changes" : "Add family member"}
      </Button>
    </form>
  );
}
export default MemberForm;
