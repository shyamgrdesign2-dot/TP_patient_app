import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { formatDate } from "../../shared/data";
import { ageLabel, memberMeta } from "../../shared/age";
import { MemberForm } from "../components/MemberForm";
import {
  Button,
  PatientName,
  Avatar,
  PatternAvatar,
  Badge,
  Icon,
  PageHeader,
  SectionTitle,
  Sheet,
  Notice,
  Meta,
  Row,
  BrandLogo,
  Status,
  IconButton,
} from "../components/ui";
import s from "../App.module.css";
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
                    <Meta
                      className={s.metaText}
                      items={[m.relation, ...memberMeta(m), m.mrn]}
                    />
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
            <Meta className={s.metaText}>
              {activeMember.relation}
              {activeMember.mrn}
            </Meta>
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
          {activeMember.dobFromAge ? (
            <>
              <dt>Age</dt>
              <dd>{ageLabel(activeMember) || "Not added"}</dd>
            </>
          ) : (
            <>
              <dt>Date of birth</dt>
              <dd>
                <Meta>
                  {formatDate(activeMember.dob, { year: "numeric" })}
                  {ageLabel(activeMember)}
                </Meta>
              </dd>
            </>
          )}
          <dt>Gender</dt>
          <dd>{activeMember.gender || "Not added"}</dd>
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
export { MemberForm };
