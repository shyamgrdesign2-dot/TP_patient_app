import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import {
  ConfirmDialog,
  Chip,
  Divider,
  SegmentedControl,
} from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import {
  doctors,
  specialties,
  formatDate,
  money,
  feeFor,
  slots,
  dateKey,
} from "../../shared/data";
import { locations } from "../../shared/brand";
import { download, calendarFile } from "../services/files";
import {
  Button,
  PatientName,
  DoctorName,
  Badge,
  Avatar,
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
  Status,
  Tag,
  useAction,
} from "../components/ui";
import s from "../App.module.css";
import v from "../components/VisitExperience.module.css";
import VisitType from "../components/VisitType";
import { MemberForm } from "./Family";
import SymptomPrompt from "../components/SymptomPrompt";
import DatePicker from "../components/DatePicker";
import { LocationChip } from "../components/LocationSheet";
import { needsSymptoms } from "../services/symptomReminders";
import {
  isVideo,
  joinState,
  joinOpensAt,
  clockLabel,
} from "../../shared/videoVisit";
export function Doctors() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All specialties");
  const [selected, setSelected] = useState(null);
  const result = doctors.filter(
    (d) =>
      d.locations.includes(state.location) &&
      (specialty === "All specialties" || d.specialty === specialty) &&
      `${d.name} ${d.specialty} ${d.languages}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className={s.page}>
      <PageHeader title="Find your doctor" trailing={<LocationChip />} />
      <MemberContext />
      <Field
        aria-label="Search doctors"
        placeholder="Doctor, specialty or language"
        leftIcon={<Icon name="search-normal" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ChoiceGroup
        label="Specialty"
        hideLabel
        options={specialties.map(([label]) => label)}
        value={specialty}
        onChange={setSpecialty}
      />
      <div className={s.listMeta}>
        <span>
          {result.length} {result.length === 1 ? "doctor" : "doctors"} at{" "}
          {locations.find((l) => l.id === state.location).name}
        </span>
      </div>
      <div className={s.stack}>
        {result.map((d) => (
          <article className={s.doctorCard} key={d.id}>
            <button
              className={s.doctorProfileButton}
              onClick={() => setSelected(d)}
            >
              <Avatar
                name={d.name.replace("Dr. ", "")}
                src={d.image}
                size={64}
                shape="rounded"
                radius={12}
                color="primary"
              />
              <span className={`${s.grow} ${s.doctorInfo}`}>
                <h3 className={s.cardTitle}>{d.name}</h3>
                <span className={s.education}>
                  {d.qualification.split(" · ")[0]}, {d.specialty}
                </span>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
            <div className={s.doctorMeta}>
              <span>{d.experience} y exp</span>
              <span className={s.metaDivider} aria-hidden="true" />
              <span>{d.languages}</span>
            </div>
            <Divider />
            <div className={s.doctorBooking}>
              {feeFor(d) != null ? (
                <div>
                  <strong>{money(feeFor(d))}</strong>
                  <small>Consultation fee</small>
                </div>
              ) : (
                <div>
                  <small>Fee payable at the clinic</small>
                </div>
              )}
              <Button
                variant="tonal"
                size="sm"
                onClick={() => navigate(`/book/${d.id}`)}
              >
                Book a visit
              </Button>
            </div>
          </article>
        ))}
      </div>
      {!result.length && (
        <Empty
          icon="search-normal"
          title="No doctors found"
          description="Try another name or specialty."
          action="Clear filters"
          onAction={() => {
            setSearch("");
            setSpecialty("All specialties");
          }}
        />
      )}
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Meet your doctor"
        footer={
          <Button
            fullWidth
            onClick={() => {
              setSelected(null);
              navigate(`/book/${selected?.id}`);
            }}
          >
            Book an appointment
          </Button>
        }
      >
        {selected && (
          <>
            <div className={s.doctorRow}>
              <Avatar
                name={selected.name.replace("Dr. ", "")}
                color="primary"
                src={selected.image}
                size={80}
                shape="rounded"
              />
              <div>
                <h2>{selected.name}</h2>
                <p>{selected.specialty}</p>
                <Badge>{selected.experience} years of experience</Badge>
              </div>
            </div>
            <h3>About your doctor</h3>
            <p>{selected.about}</p>
            <h3>Qualifications</h3>
            <p>{selected.qualification}</p>
            <h3>Languages spoken</h3>
            <p>{selected.languages}</p>
          </>
        )}
      </Sheet>
    </div>
  );
}
// Time slots as Tesseract chips, grouped by part of day.
function SlotPicker({ options, value, onChange, isBooked = () => false }) {
  // 12 PM to 4:59 PM is afternoon; 5 PM onwards is evening.
  const hour = (t) => {
    const [h] = t.split(":").map(Number);
    return (h % 12) + (t.endsWith("PM") ? 12 : 0);
  };
  const groups = [
    ["Morning", "sun-fog", options.filter((t) => hour(t) < 12)],
    ["Afternoon", "sun", options.filter((t) => hour(t) >= 12 && hour(t) < 17)],
    ["Evening", "moon", options.filter((t) => hour(t) >= 17)],
  ].filter(([, , times]) => times.length);
  return groups.map(([label, icon, times]) => (
    <div className={s.slotGroup} key={label}>
      <span id={`slots-${label}`} className={s.slotLabel}>
        <Icon name={icon} family="weather" size={16} bulk={false} />
        {label}
      </span>
      <div className={s.slots} role="group" aria-labelledby={`slots-${label}`}>
        {times.map((t) => {
          const selected = value === t;
          const booked = isBooked(t);
          return (
            <Chip
              key={t}
              selected={selected}
              color={selected ? "primary" : "default"}
              variant={selected ? "solid" : "outline"}
              size="lg"
              radius={12}
              label={t}
              disabled={booked}
              className={s.chip}
              onClick={() => onChange(t)}
              onKeyDown={(event) => {
                if (!booked && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onChange(t);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  ));
}
export function Booking() {
  const { state, activeMember, dispatch, notify, openAgent } = useApp();
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const routeState = useLocation().state;
  const doctor = doctors.find((d) => d.id === doctorId);
  const [step, setStep] = useState(0);
  const [memberId, setMemberId] = useState(activeMember.id);
  const [date, setDate] = useState(dateKey(1));
  const [time, setTime] = useState("");
  const [type, setType] = useState("In-person");
  const [addingMember, setAddingMember] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { busy, error, run, setError } = useAction();
  if (!doctor)
    return (
      <div className={s.page}>
        <PageHeader title="Book a visit" />
        <Empty
          title="Doctor not found"
          description="Choose a doctor from the hospital directory."
          action="Find a doctor"
          onAction={() => navigate("/doctors")}
        />
      </div>
    );
  const member = state.members.find((m) => m.id === memberId);
  const location = doctor.locations.includes(state.location)
    ? state.location
    : doctor.locations[0];
  const booked = state.appointments
    .filter(
      (a) =>
        a.doctorId === doctor.id && a.date === date && a.status === "Confirmed",
    )
    .map((a) => a.time);
  function confirm() {
    run(async () => {
      setConfirming(true);
      await new Promise((r) =>
        setTimeout(
          r,
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 2000,
        ),
      );
      const booking = {
        id: `TP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        doctorId: doctor.id,
        memberId,
        date,
        time,
        type,
        location,
        source: "Patient",
        ...(routeState?.memberId === memberId && routeState?.intakeAnswers
          ? {
              symptomIntake: {
                note: routeState.intakeNote,
                answers: routeState.intakeAnswers,
                source: "local-demo",
                updatedAt: new Date().toISOString(),
              },
            }
          : {}),
      };
      dispatch({ type: "BOOK", booking });
      dispatch({ type: "SELECT_MEMBER", id: memberId });
      setConfirmed(booking);
      setConfirming(false);
      notify("Appointment booked successfully.");
    });
  }
  if (confirmed)
    return (
      <div className={s.page}>
        <PageHeader title="You’re all booked" />
        <div className={`${s.successHero} ${s.successArrive}`}>
          <span>
            <Icon name="tick-circle" size={40} bulk />
          </span>
          <h1>
            A little closer
            <br />
            to feeling better.
          </h1>
          <p>Your appointment is confirmed.</p>
          <Badge color="success">{confirmed.id}</Badge>
        </div>
        <div className={`${s.detailCard} ${s.confirmCard}`}>
          <div className={s.doctorRow}>
            <Avatar
              src={doctor.image}
              name={doctor.name.replace("Dr. ", "")}
              size={56}
              color="primary"
            />
            <div>
              <h3>
                <DoctorName doctor={doctor} />
              </h3>
              <p>{doctor.specialty}</p>
            </div>
          </div>
          <dl>
            <dt>Patient</dt>
            <dd>
              <PatientName member={member} />
            </dd>
            <dt>When</dt>
            <dd>
              {formatDate(date)} · {time}
            </dd>
            <dt>Where</dt>
            <dd>
              {type === "Video consultation"
                ? "Online"
                : locations.find((l) => l.id === location).name}
            </dd>
            <dt>Visit type</dt>
            <dd>
              <VisitType type={type} />
            </dd>
            <dt>Payment</dt>
            <dd>
              {feeFor(doctor, type) != null
                ? `${money(feeFor(doctor, type))} · Pay at hospital`
                : "Fee payable at the clinic"}
            </dd>
          </dl>
        </div>
        <Notice icon="calendar-tick" tone="warning">
          Please arrive 15 minutes before your appointment and bring any
          previous reports.
        </Notice>
        <div className={v.visitActions}>
          <Button
            variant="solid"
            className={v.aiAction}
            fullWidth
            onClick={() =>
              openAgent({ kind: "symptoms", appointmentId: confirmed.id })
            }
          >
            <Icon name="add-plain" /> Share symptoms before your visit
          </Button>
          <div className={v.secondaryActions}>
            <Button variant="outline" onClick={() => navigate("/appointments")}>
              View my appointments
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() =>
                download(
                  "appointment.ics",
                  calendarFile(
                    confirmed,
                    doctor,
                    locations.find((l) => l.id === location),
                  ),
                  "text/calendar",
                )
              }
            >
              Add to calendar
            </Button>
          </div>
        </div>
      </div>
    );
  const placeName = locations.find((l) => l.id === location).name;
  return (
    <div className={s.page}>
      <PageHeader
        title="Book an appointment"
        onBack={() => {
          if (step === 0) return false;
          setStep(step - 1);
          return true;
        }}
      />
      {/* Compact info card for the doctor being booked. */}
      <div className={s.bookingDoctor}>
        <Avatar
          src={doctor.image}
          name={doctor.name.replace("Dr. ", "")}
          color="primary"
          size={44}
          shape="rounded"
          radius={10}
        />
        <div className={s.grow}>
          <h3>
            <DoctorName doctor={doctor} />
          </h3>
          <p>{doctor.specialty}</p>
        </div>
        {feeFor(doctor) != null && (
          <strong aria-label={`Consultation fee ${money(feeFor(doctor))}`}>
            {money(feeFor(doctor))}
          </strong>
        )}
      </div>
      <BookingStep
        title="When"
        open={step === 0}
        done={step > 0}
        onEdit={() => setStep(0)}
        leaving={leaving && step === 0}
        kind={<VisitType type={type} />}
        summary={
          <>
            <span>{formatDate(date, { weekday: "short" })}</span>
            <span>{time} IST</span>
          </>
        }
      >
        <div className={s.sectionLabel}>
          <SegmentedControl
            aria-label="Visit type"
            className={s.visitSegment}
            variant="block"
            radius={10}
            fullWidth
            options={[
              {
                value: "In-person",
                label: "In clinic",
                icon: (
                  <Icon
                    name="hospital"
                    family="building"
                    corner="rounded"
                    size={16}
                  />
                ),
              },
              {
                value: "Video consultation",
                label: "Video consultation",
                icon: (
                  <Icon
                    name="video"
                    family="video-audio-image"
                    corner="rounded"
                    size={16}
                  />
                ),
              },
            ]}
            value={type}
            onValueChange={setType}
          />
          <DatePicker
            value={date}
            onChange={(d) => {
              setDate(d);
              setTime("");
            }}
          />
          <SectionTitle>Available times</SectionTitle>
          <SlotPicker
            options={slots}
            value={time}
            onChange={setTime}
            isBooked={(t) => booked.includes(t)}
          />
        </div>
      </BookingStep>
      {step >= 1 && (
        <BookingStep
          title="Patient"
          open={step === 1}
          done={step > 1}
          onEdit={() => setStep(1)}
          leaving={leaving && step === 1}
          kind={
            <span className={s.bookingKind}>
              <Icon name="profile-circle" size={16} />
              {member.relation}
            </span>
          }
          summary={
            <>
              <PatientName member={member} />
              <span>{memberMeta(member)}</span>
            </>
          }
        >
          <PatientPicker
            members={state.members}
            value={memberId}
            onChange={setMemberId}
          />
          <Button
            variant="outline"
            fullWidth
            onClick={() => setAddingMember(true)}
          >
            <Icon name="add" /> Add a new family member
          </Button>
          <Notice icon="shield-tick">
            Your appointment and related records will be attached to{" "}
            {member.name}’s profile.
          </Notice>
        </BookingStep>
      )}
      <Sheet
        open={addingMember}
        onClose={() => setAddingMember(false)}
        title="Add a family member"
      >
        {addingMember && (
          <MemberForm
            onClose={() => setAddingMember(false)}
            onSave={(profile) => {
              setMemberId(profile.id);
              setAddingMember(false);
            }}
          />
        )}
      </Sheet>
      {step === 2 && (
        <div className={s.detailCard}>
          <dl>
            <dt>Hospital</dt>
            <dd>{type === "Video consultation" ? "Online" : placeName}</dd>
            <dt>Visit</dt>
            <dd>
              <VisitType type={type} />
            </dd>
          </dl>
          <div className={s.total}>
            <span>Consultation fee</span>
            <strong>
              {feeFor(doctor, type) != null
                ? money(feeFor(doctor, type))
                : "Payable at the clinic"}
            </strong>
          </div>
          <p className={s.footnote}>
            Pay at the hospital. No payment is collected now. You can reschedule
            or cancel from My visits.
          </p>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      {confirming && (
        <div className={s.confirmingOverlay} role="status">
          <span className={s.confirmingRing} aria-hidden="true" />
          <p>Confirming your appointment…</p>
        </div>
      )}
      <div className={s.stickyActions}>
        <Button
          fullWidth
          disabled={step === 0 && !time}
          loading={busy}
          onClick={() => {
            setError("");
            if (step === 2) return confirm();
            // Collapse the open section, then reveal its summary card.
            setLeaving(true);
            setTimeout(
              () => {
                setStep(step + 1);
                setLeaving(false);
              },
              window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? 0
                : 260,
            );
          }}
        >
          {step === 2 ? "Confirm appointment" : "Continue"}
          {step < 2 && <Icon name="chevron-right" size={18} />}
        </Button>
      </div>
    </div>
  );
}
// A booking section: open while it is the current task, then collapsed to a
// one-line summary with Edit so the patient can jump back to it.
function BookingStep({
  title,
  kind,
  open,
  done,
  leaving,
  summary,
  onEdit,
  children,
}) {
  if (open)
    return (
      <section
        className={s.bookingStep}
        aria-label={title}
        data-leaving={leaving || undefined}
      >
        {children}
      </section>
    );
  if (!done) return null;
  return (
    <section className={s.bookingSummary} aria-label={`${title}: done`}>
      <div className={s.grow}>
        <span className={s.bookingKind}>{kind}</span>
        <span className={s.bookingSummaryValue}>{summary}</span>
      </div>
      <Button
        variant="link"
        size="sm"
        leftIcon={<Icon name="edit" size={16} />}
        onClick={onEdit}
      >
        Edit
      </Button>
    </section>
  );
}
const ageOf = (dob) => {
  if (!dob) return null;
  const born = new Date(`${dob}T12:00:00`);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  )
    age -= 1;
  return age;
};
const memberMeta = (m) =>
  [
    ageOf(m.dob) != null && `${ageOf(m.dob)} yrs`,
    m.gender && m.gender !== "Prefer not to say" && m.gender,
  ]
    .filter(Boolean)
    .join(" · ");
// Stacked radio cards: name (relation), age and gender, selection mark.
function PatientPicker({ members, value, onChange }) {
  return (
    <div
      className={s.patientPicker}
      role="radiogroup"
      aria-label="Who is this visit for?"
    >
      <h2 className={s.fieldLabel}>Who is this visit for?</h2>
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          className={s.patientOption}
          onClick={() => onChange(m.id)}
        >
          <Avatar name={m.name} size={40} color="primary" />
          <span className={s.grow}>
            <strong>
              <PatientName member={m} /> <span>({m.relation})</span>
            </strong>
            {memberMeta(m) && <small>{memberMeta(m)}</small>}
          </span>
          <span className={s.radioMark} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
// One primary action per card, in order of what the patient needs next.
function CardAction({ visit, upcoming, onDetails, onJoin }) {
  const { openAgent } = useApp();
  const join = upcoming ? joinState(visit) : null;
  if (join === "open")
    return (
      <Button size="sm" onClick={onJoin}>
        <Icon
          name="video"
          family="video-audio-image"
          corner="rounded"
          size={16}
        />
        Join video call
      </Button>
    );
  if (upcoming && needsSymptoms(visit))
    return (
      <Button
        size="sm"
        className={v.aiAction}
        leftIcon={<Icon name="add-plain" size={16} />}
        onClick={() => openAgent({ kind: "symptoms", appointmentId: visit.id })}
      >
        Add symptoms
      </Button>
    );
  if (join === "early")
    return (
      <Button size="sm" variant="tonal" disabled>
        Join from {clockLabel(joinOpensAt(visit))}
      </Button>
    );
  return (
    <Button size="sm" variant="tonal" onClick={onDetails}>
      View details
    </Button>
  );
}
function JoinVideoSheet({ visit, onClose }) {
  const { notify } = useApp();
  const doctor = visit && doctors.find((d) => d.id === visit.doctorId);
  return (
    <Sheet
      open={!!visit}
      onClose={onClose}
      title="Join video consultation"
      headerIcon="video"
    >
      {visit && (
        <>
          <div className={s.doctorRow}>
            <Avatar
              src={doctor.image}
              name={doctor.name.replace("Dr. ", "")}
              size={56}
              color="primary"
            />
            <div>
              <h3>
                <DoctorName doctor={doctor} />
              </h3>
              <p>
                {doctor.specialty} · {visit.time}
              </p>
            </div>
          </div>
          <ul className={v.joinChecklist}>
            <li>
              <Icon name="tick-circle" size={18} bulk /> Find a quiet, well-lit
              place
            </li>
            <li>
              <Icon name="tick-circle" size={18} bulk /> Allow camera and
              microphone when asked
            </li>
            <li>
              <Icon name="tick-circle" size={18} bulk /> Keep your reports and
              medicines nearby
            </li>
          </ul>
          <SymptomPrompt visit={visit} onOpen={onClose} />
          <Button
            fullWidth
            onClick={() => {
              notify("Connecting you to your doctor…");
              onClose();
            }}
          >
            <Icon name="video" family="video-audio-image" corner="rounded" />
            Join now
          </Button>
        </>
      )}
    </Sheet>
  );
}
// One visit card, shared by My visits and Home's past consultations so both
// render the same markup.
export function AppointmentCard({
  visit,
  upcoming = false,
  onDetails,
  onJoin,
  className = "",
}) {
  const d = doctors.find((x) => x.id === visit.doctorId);
  if (!d) return null;
  return (
    <article className={`${s.appointmentCard} ${className}`}>
      <div className={s.appointmentDate}>
        <span>
          <Icon name="calendar-2" size={16} bulk />
          {formatDate(visit.date)} · {visit.time}
        </span>
        <Status status={visit.status} />
      </div>
      <button
        className={s.doctorProfileButton}
        aria-label={`View appointment with ${d.name}`}
        onClick={onDetails}
      >
        <Avatar
          src={d.image}
          name={d.name.replace("Dr. ", "")}
          size={56}
          shape="rounded"
          radius={12}
          color="primary"
        />
        <span className={s.grow}>
          <h3 className={s.cardTitle}>
            <DoctorName doctor={d} />
          </h3>
          <span className={s.cardSubtitle}>{d.specialty}</span>
        </span>
        <Icon name="chevron-right" size={16} />
      </button>
      <div className={s.appointmentBottom}>
        <span className={s.appointmentMeta}>
          <VisitType
            type={visit.type}
            compact
            place={locations.find((l) => l.id === visit.location)?.name}
          />
        </span>
        <CardAction
          visit={visit}
          upcoming={upcoming}
          onDetails={onDetails}
          onJoin={onJoin}
        />
      </div>
    </article>
  );
}
export function Appointments() {
  const { state, activeMember, dispatch, notify, openAgent } = useApp();
  const navigate = useNavigate();
  const [visitParams] = useSearchParams();
  const requested = state.appointments.find(
    (visit) =>
      visit.id === visitParams.get("visit") &&
      visit.memberId === activeMember.id,
  );
  const [tab, setTab] = useState(
    requested?.status === "Completed" || visitParams.get("tab") === "past"
      ? "Past"
      : "Upcoming",
  );
  const [selected, setSelected] = useState(requested || null);
  const [cancel, setCancel] = useState(null);
  const [joining, setJoining] = useState(null);
  const [reschedule, setReschedule] = useState(false);
  const [date, setDate] = useState(dateKey(1));
  const [time, setTime] = useState("");
  const { error, run } = useAction();
  const items = state.appointments.filter(
    (a) =>
      a.memberId === activeMember.id &&
      (tab === "Upcoming"
        ? a.status === "Confirmed"
        : tab === "Past"
          ? a.status === "Completed"
          : a.status === "Cancelled"),
  );
  // With nothing booked, the empty state's "Find a doctor" is the only CTA.
  const hasUpcoming = state.appointments.some(
    (a) => a.memberId === activeMember.id && a.status === "Confirmed",
  );
  const selectedDoctor = doctors.find((d) => d.id === selected?.doctorId);
  const refreshSelected =
    selected && state.appointments.find((a) => a.id === selected.id);
  // The prescription issued at this visit, matched by visit ID or by the
  // same doctor on the same day.
  const prescription =
    refreshSelected?.status === "Completed"
      ? state.records.find(
          (r) =>
            r.category === "Prescriptions" &&
            r.memberId === refreshSelected.memberId &&
            (r.appointmentId === refreshSelected.id ||
              (r.doctorId === refreshSelected.doctorId &&
                r.date === refreshSelected.date)),
        )
      : null;
  const bill =
    refreshSelected?.status === "Completed"
      ? state.bills.find((b) => b.appointmentId === refreshSelected.id)
      : null;
  return (
    <div className={s.page}>
      <PageHeader
        title="My visits"
        action={
          hasUpcoming && (
            <Button size="sm" onClick={() => navigate("/doctors")}>
              <Icon name="add" size={18} />
              Book appointment
            </Button>
          )
        }
      />
      <MemberContext />
      <SegmentedControl
        aria-label="Appointment status"
        className={s.visitSegment}
        variant="block"
        radius={10}
        fullWidth
        options={["Upcoming", "Past", "Cancelled"].map((v) => ({
          value: v,
          label: v,
        }))}
        value={tab}
        onValueChange={setTab}
      />
      <div className={s.stack}>
        {items.map((a) => (
          <AppointmentCard
            key={a.id}
            visit={a}
            upcoming={tab === "Upcoming"}
            onDetails={() => setSelected(a)}
            onJoin={() => setJoining(a)}
          />
        ))}
      </div>
      {!items.length && (
        <Empty
          icon="calendar-2"
          title={`No ${tab.toLowerCase()} appointments`}
          description={`Your ${tab.toLowerCase()} visits for ${activeMember.name.split(" ")[0]} will appear here.`}
          action="Find a doctor"
          onAction={() => navigate("/doctors")}
        />
      )}
      <Sheet
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setReschedule(false);
        }}
        title={reschedule ? "Reschedule your visit" : "Appointment details"}
      >
        {selected && (
          <>
            <div className={s.doctorRow}>
              <Avatar
                src={selectedDoctor.image}
                name={selectedDoctor.name.replace("Dr. ", "")}
                color="primary"
                size={56}
              />
              <div>
                <h3>
                  <DoctorName doctor={selectedDoctor} />
                </h3>
                <p>{selectedDoctor.specialty}</p>
              </div>
            </div>
            {!reschedule ? (
              <>
                <Status status={refreshSelected.status} />
                <dl className={s.details}>
                  <dt>Appointment ID</dt>
                  <dd>{selected.id}</dd>
                  <dt>Date & time</dt>
                  <dd>
                    {formatDate(refreshSelected.date)} · {refreshSelected.time}
                  </dd>
                  <dt>Patient</dt>
                  <dd>
                    <PatientName member={activeMember} />
                  </dd>
                  <dt>Visit type</dt>
                  <dd>
                    <VisitType type={selected.type} />
                  </dd>
                  {!isVideo(selected) && (
                    <>
                      <dt>Location</dt>
                      <dd>
                        {locations.find((l) => l.id === selected.location).name}
                      </dd>
                    </>
                  )}

                  <dt>Booked by</dt>
                  <dd>{selected.source}</dd>
                </dl>
                {refreshSelected.status === "Confirmed" && (
                  <div className={v.visitActions}>
                    {joinState(refreshSelected) === "open" && (
                      <Button
                        onClick={() => {
                          setJoining(refreshSelected);
                          setSelected(null);
                        }}
                      >
                        <Icon
                          name="video"
                          family="video-audio-image"
                          corner="rounded"
                        />
                        Join video consultation
                      </Button>
                    )}
                    <SymptomPrompt
                      visit={refreshSelected}
                      onOpen={() => setSelected(null)}
                    />
                    {!needsSymptoms(refreshSelected) && (
                      <Button
                        variant="tonal"
                        onClick={() => {
                          setSelected(null);
                          openAgent({
                            kind: "symptoms",
                            appointmentId: selected.id,
                          });
                        }}
                      >
                        <Icon name="message-text" />{" "}
                        {refreshSelected.symptomIntake ||
                        refreshSelected.symptomCollectorStatus === "completed"
                          ? "Review symptoms"
                          : "Share symptoms before your visit"}
                      </Button>
                    )}
                    <Button onClick={() => setReschedule(true)}>
                      Reschedule visit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        download(
                          "appointment.ics",
                          calendarFile(
                            refreshSelected,
                            selectedDoctor,
                            locations.find((l) => l.id === selected.location),
                          ),
                          "text/calendar",
                        )
                      }
                    >
                      Add to calendar
                    </Button>
                    <Button
                      variant="ghost"
                      theme="error"
                      onClick={() => {
                        setCancel(selected);
                        setSelected(null);
                      }}
                    >
                      Cancel appointment
                    </Button>
                  </div>
                )}
                {refreshSelected.status === "Completed" && (
                  <div className={v.visitActions}>
                    <Button
                      onClick={() => navigate(`/book/${selectedDoctor.id}`)}
                    >
                      Book a follow-up
                    </Button>
                    <div className={v.secondaryActions}>
                      <Button
                        variant="outline"
                        disabled={!prescription}
                        onClick={() =>
                          navigate(`/records?record=${prescription.id}`)
                        }
                      >
                        <Icon name="document-text" size={18} />
                        View Rx
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!bill}
                        onClick={() => navigate(`/billing?bill=${bill.id}`)}
                      >
                        <Icon name="bill" size={18} />
                        View bill
                      </Button>
                    </div>
                    {(!prescription || !bill) && (
                      <small className={s.metaText}>
                        {!prescription && !bill
                          ? "The prescription and bill appear here once the hospital shares them."
                          : !prescription
                            ? "The prescription appears here once the doctor shares it."
                            : "The bill appears here once the hospital generates it."}
                      </small>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <Field
                  type="date"
                  label="New appointment date"
                  min={dateKey(1)}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime("");
                  }}
                />
                <div className={s.fieldGroup}>
                  <span className={s.fieldLabel}>Choose a new time</span>
                  <SlotPicker
                    options={slots.filter(
                      (t) =>
                        !state.appointments.some(
                          (a) =>
                            a.id !== selected.id &&
                            a.doctorId === selected.doctorId &&
                            a.date === date &&
                            a.time === t &&
                            a.status === "Confirmed",
                        ),
                    )}
                    value={time}
                    onChange={setTime}
                  />
                </div>
                <Button
                  disabled={!time}
                  onClick={() =>
                    run(() => {
                      dispatch({
                        type: "RESCHEDULE",
                        id: selected.id,
                        date,
                        time,
                      });
                      notify("Appointment rescheduled.");
                      setSelected(null);
                      setReschedule(false);
                    })
                  }
                >
                  Confirm new time
                </Button>
              </>
            )}
            <ErrorText>{error}</ErrorText>
          </>
        )}
      </Sheet>
      <JoinVideoSheet visit={joining} onClose={() => setJoining(null)} />
      <ConfirmDialog
        open={!!cancel}
        onOpenChange={(open) => !open && setCancel(null)}
        title="Cancel this appointment?"
        description="The slot will be released. You can always book another visit."
        primaryLabel="Keep appointment"
        onPrimary={() => setCancel(null)}
        secondaryLabel="Cancel appointment"
        secondaryTone="destructive"
        onSecondary={() => {
          try {
            dispatch({ type: "CANCEL", id: cancel.id });
            notify("Appointment cancelled.");
          } catch (e) {
            notify(e.message, true);
          }
          setCancel(null);
        }}
      />
    </div>
  );
}
