import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ConfirmDialog } from "@dhspl-tatvacare/tesseract-ui";
import { useApp } from "../state/AppContext";
import {
  doctors,
  specialties,
  formatDate,
  money,
  slots,
  dateKey,
} from "../services/data";
import { locateForCheckIn } from "../services/checkIn";
import { locations } from "../config/brand";
import { download, calendarFile } from "../services/files";
import {
  Button,
  PatientName,
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
  useAction,
} from "../components/ui";
import s from "../App.module.css";
import v from "../components/VisitExperience.module.css";
import VisitType from "../components/VisitType";
import { MemberForm } from "./Family";
import SymptomPrompt from "../components/SymptomPrompt";
import { needsSymptoms } from "../services/symptomReminders";
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
      <PageHeader title="Find your doctor" />
      <MemberContext />
      <Field
        aria-label="Search doctors"
        placeholder="Doctor, specialty or language"
        leftIcon={<Icon name="search-normal" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className={s.horizontalChips}>
        {specialties.map(([label, icon]) => (
          <Button
            key={label}
            variant={label === specialty ? "tonal" : "outline"}
            theme={label === specialty ? "primary" : "neutral"}
            onClick={() => setSpecialty(label)}
            aria-pressed={label === specialty}
          >
            <Icon name={icon} size={16} />
            {label}
          </Button>
        ))}
      </div>
      <div className={s.listMeta}>
        {result.length} doctors ·{" "}
        {locations.find((l) => l.id === state.location).name}
        <span>Sample directory</span>
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
                size={72}
                shape="rounded"
              />
              <span className={s.grow}>
                <h3>{d.name}</h3>
                <span className={s.specialty}>{d.specialty}</span>
                <small>{d.experience} years of experience</small>
                <span className={s.rating}>
                  <Icon name="star" size={14} bulk />
                  {d.rating} <small>({d.reviews} reviews)</small>
                </span>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
            <div className={s.doctorMeta}>
              <span>
                <Icon name="translate" size={14} />
                {d.languages}
              </span>
              <small>{d.qualification}</small>
            </div>
            <div className={s.doctorBooking}>
              <div>
                <strong>{money(d.fee)}</strong>
                <small>Consultation fee</small>
              </div>
              <Button onClick={() => navigate(`/book/${d.id}`)}>
                Book a visit <Icon name="chevron-right" size={16} />
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
                name={selected.name}
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
            <Notice>
              Doctor names, availability and reviews are illustrative demo
              content.
            </Notice>
          </>
        )}
      </Sheet>
    </div>
  );
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
      notify("Your demo appointment is confirmed.");
    });
  }
  if (confirmed)
    return (
      <div className={s.page}>
        <PageHeader title="You’re all booked" />
        <div className={s.steps} aria-label="Booking complete: step 5 of 5">
          {["Doctor", "Slot", "Patient", "Review", "Confirmed"].map((text) => (
            <span key={text} data-active="true">
              <b>✓</b>
              {text}
            </span>
          ))}
        </div>
        <div className={s.successHero}>
          <span>
            <Icon name="tick-circle" size={56} bulk />
          </span>
          <h1>
            A little closer
            <br />
            to feeling better.
          </h1>
          <p>Your appointment is confirmed.</p>
          <Badge color="success">{confirmed.id}</Badge>
        </div>
        <div className={s.detailCard}>
          <div className={s.doctorRow}>
            <Avatar src={doctor.image} name={doctor.name} size={56} />
            <div>
              <h3>{doctor.name}</h3>
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
            <dd>{locations.find((l) => l.id === location).name}</dd>
            <dt>Visit type</dt>
            <dd>
              <VisitType type={type} />
            </dd>
            <dt>Payment</dt>
            <dd>{money(doctor.fee)} · Pay at hospital</dd>
          </dl>
        </div>
        <Notice icon="calendar-tick">
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
            <Icon name="add" /> Share symptoms before your visit
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
        <p className={s.footnote}>
          Demo booking · No hospital appointment has been created.
        </p>
      </div>
    );
  return (
    <div className={s.page}>
      <PageHeader title="Book an appointment" />
      <div className={s.steps}>
        {["Doctor", "Slot", "Patient", "Review", "Confirmed"].map((text, i) => (
          <span key={text} data-active={step + 1 >= i}>
            <b>{step + 1 > i ? "✓" : i + 1}</b>
            {text}
          </span>
        ))}
      </div>
      <div className={s.doctorRow}>
        <Avatar
          src={doctor.image}
          name={doctor.name}
          size={60}
          shape="rounded"
        />
        <div>
          <h3>{doctor.name}</h3>
          <p>{doctor.specialty}</p>
          <small>{money(doctor.fee)} per consultation</small>
        </div>
      </div>
      {step === 0 && (
        <>
          <ChoiceGroup
            label="Visit type"
            options={[
              {
                value: "In-person",
                label: "In clinic",
                icon: (
                  <Icon
                    name="hospital"
                    family="building"
                    corner="rounded"
                    bulk
                    size={18}
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
                    bulk
                    size={18}
                  />
                ),
              },
            ]}
            value={type}
            onChange={setType}
          />
          <SectionTitle>Choose a day</SectionTitle>
          <div className={s.dateStrip}>
            {Array.from({ length: 7 }, (_, i) => dateKey(i + 1)).map((d) => (
              <button
                key={d}
                data-selected={date === d}
                onClick={() => {
                  setDate(d);
                  setTime("");
                }}
              >
                <small>
                  {formatDate(d, { weekday: "short" })
                    .split(",")[0]
                    .slice(0, 3)}
                </small>
                <strong>{new Date(`${d}T12:00:00`).getDate()}</strong>
                <small>{formatDate(d, { month: "short" }).split(" ")[1]}</small>
              </button>
            ))}
          </div>
          <SectionTitle>Available times</SectionTitle>
          <div className={s.slots}>
            {slots.map((t) => (
              <Button
                key={t}
                variant={time === t ? "tonal" : "outline"}
                disabled={booked.includes(t)}
                aria-pressed={time === t}
                onClick={() => setTime(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <p className={s.footnote}>All times in IST · Sample availability</p>
        </>
      )}
      {step === 1 && (
        <>
          <ChoiceGroup
            label="Who is this visit for?"
            options={state.members.map((m) => ({
              value: m.id,
              label: `${m.name.split(" ")[0]} (${m.relation})`,
            }))}
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
          <Notice icon="shield-tick">
            Your appointment and related records will be attached to{" "}
            {member.name}’s profile.
          </Notice>
        </>
      )}
      {step === 2 && (
        <>
          <h2>Everything look right?</h2>
          <div className={s.detailCard}>
            <dl>
              <dt>Patient</dt>
              <dd>
                <PatientName member={member} />
              </dd>
              <dt>Doctor</dt>
              <dd>{doctor.name}</dd>
              <dt>Date</dt>
              <dd>{formatDate(date, { weekday: "long" })}</dd>
              <dt>Time</dt>
              <dd>{time} IST</dd>
              <dt>Hospital</dt>
              <dd>{locations.find((l) => l.id === location).name}</dd>
              <dt>Visit</dt>
              <dd>
                <VisitType type={type} />
              </dd>
            </dl>
            <div className={s.total}>
              <span>Consultation fee</span>
              <strong>{money(doctor.fee)}</strong>
            </div>
            <p className={s.footnote}>
              Pay at the hospital. No payment is collected now.
            </p>
          </div>
          <Notice>
            Appointments can be rescheduled or cancelled from My visits.
            Hospital-specific cancellation policies will apply in the live app.
          </Notice>
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <div className={s.stickyActions}>
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        <Button
          fullWidth
          disabled={step === 0 && !time}
          loading={busy}
          onClick={() => {
            setError("");
            step < 2 ? setStep(step + 1) : confirm();
          }}
        >
          {step === 2 ? "Confirm demo appointment" : "Continue"}
          <Icon name="chevron-right" size={18} />
        </Button>
      </div>
    </div>
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
    requested?.status === "Completed" ? "Past" : "Upcoming",
  );
  const [selected, setSelected] = useState(requested || null);
  const [cancel, setCancel] = useState(null);
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
  const selectedDoctor = doctors.find((d) => d.id === selected?.doctorId);
  const refreshSelected =
    selected && state.appointments.find((a) => a.id === selected.id);
  return (
    <div className={s.page}>
      <PageHeader
        title="My visits"
        action={
          <Button size="sm" onClick={() => navigate("/doctors")}>
            <Icon name="add" size={18} />
            Book appointment
          </Button>
        }
      />
      <MemberContext />
      <ChoiceGroup
        label="Appointment status"
        options={["Upcoming", "Past", "Cancelled"]}
        value={tab}
        onChange={setTab}
      />
      <div className={s.stack}>
        {items.map((a) => {
          const d = doctors.find((d) => d.id === a.doctorId);
          return (
            <article className={s.appointmentCard} key={a.id}>
              <div className={s.appointmentDate}>
                <span>
                  <Icon name="calendar-2" size={16} />
                  {formatDate(a.date)} · {a.time}
                </span>
                <Status status={a.status} />
              </div>
              <button
                className={s.doctorProfileButton}
                aria-label={`View appointment with ${d.name}`}
                onClick={() => setSelected(a)}
              >
                <Avatar src={d.image} name={d.name} size={56} shape="rounded" />
                <span className={s.grow}>
                  <h3>{d.name}</h3>
                  <p>{d.specialty}</p>
                  <VisitType type={a.type} />
                  <small>
                    {a.source === "Hospital"
                      ? "Booked by hospital"
                      : `Booked by ${a.source.toLowerCase()}`}
                  </small>
                </span>
                <Icon name="chevron-right" size={16} />
              </button>
              <div className={s.appointmentBottom}>
                <span>
                  <Icon name="location" size={14} />
                  {locations.find((l) => l.id === a.location).name}
                </span>
                <Button
                  leftIcon={
                    tab === "Upcoming" && needsSymptoms(a) ? (
                      <Icon name="add" size={16} />
                    ) : undefined
                  }
                  variant={
                    tab === "Upcoming" && needsSymptoms(a) ? "solid" : "tonal"
                  }
                  className={
                    tab === "Upcoming" && needsSymptoms(a)
                      ? v.aiAction
                      : undefined
                  }
                  size="sm"
                  onClick={() =>
                    tab === "Upcoming" && needsSymptoms(a)
                      ? openAgent({ kind: "symptoms", appointmentId: a.id })
                      : a.queue && a.status === "Confirmed"
                        ? navigate(`/queue?visit=${encodeURIComponent(a.id)}`)
                        : setSelected(a)
                  }
                >
                  {tab === "Upcoming" && needsSymptoms(a)
                    ? "Add symptoms"
                    : a.queue && a.status === "Confirmed"
                      ? "View queue"
                      : "View details"}
                </Button>
              </div>
            </article>
          );
        })}
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
                name={selectedDoctor.name}
                size={56}
              />
              <div>
                <h3>{selectedDoctor.name}</h3>
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

                  <dt>Booked by</dt>
                  <dd>{selected.source}</dd>
                </dl>
                {refreshSelected.status === "Confirmed" && (
                  <div className={v.visitActions}>
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
                  <Button
                    onClick={() => navigate(`/book/${selectedDoctor.id}`)}
                  >
                    Book a follow-up
                  </Button>
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
                <ChoiceGroup
                  label="Choose a new time"
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
export function Queue() {
  const { state, activeMember, dispatch, notify, openAgent } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { busy, error, run } = useAction();
  const appointment = state.appointments
    .filter(
      (item) =>
        item.memberId === activeMember.id &&
        (!params.get("visit") || item.id === params.get("visit")) &&
        item.status === "Confirmed" &&
        item.type === "In-person" &&
        item.date >= dateKey(),
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        Number(!!b.queue?.checkedIn) - Number(!!a.queue?.checkedIn),
    )[0];
  const doctor = doctors.find((item) => item.id === appointment?.doctorId);
  const hospital = locations.find((item) => item.id === appointment?.location);
  const checkedIn = appointment?.queue?.checkedIn;
  const intakeReady =
    appointment?.symptomIntake ||
    appointment?.symptomIntakeSkipped ||
    appointment?.symptomCollectorStatus === "completed";
  const longWait =
    checkedIn &&
    appointment.queue.minutes > (appointment.queue.expectedMinutes ?? 30);
  return (
    <div className={s.page}>
      <PageHeader title="Your place in line" />
      <MemberContext />
      {appointment ? (
        <>
          {!checkedIn && (
            <section className={s.detailCard}>
              <span className={s.eyebrow}>BEFORE YOUR CONSULTATION</span>
              <h2>
                {intakeReady
                  ? "You’re ready to check in"
                  : "First, tell us how you’re feeling"}
              </h2>
              <p>
                {intakeReady
                  ? "Your appointment is confirmed. Check in when you arrive at the hospital to receive your queue token."
                  : "Let the symptom collector guide you through your symptoms, duration, medical history and questions. Review your summary, then continue to hospital check-in."}
              </p>
              {!intakeReady && (
                <>
                  <Button
                    className={v.aiAction}
                    fullWidth
                    onClick={() =>
                      openAgent({
                        kind: "symptoms",
                        appointmentId: appointment.id,
                        returnTo: "queue",
                      })
                    }
                  >
                    Share symptoms <Icon name="chevron-right" />
                  </Button>
                  <Button
                    variant="link"
                    fullWidth
                    onClick={() =>
                      dispatch({ type: "SKIP_SYMPTOMS", id: appointment.id })
                    }
                  >
                    Skip symptoms for now
                  </Button>
                </>
              )}
              {appointment.symptomIntake && (
                <Button
                  variant="link"
                  onClick={() =>
                    openAgent({
                      kind: "symptoms",
                      appointmentId: appointment.id,
                      returnTo: "queue",
                    })
                  }
                >
                  Review my symptoms
                </Button>
              )}
            </section>
          )}
          {(checkedIn || intakeReady) && (
            <>
              <div
                className={s.queueCard}
                data-tone={
                  checkedIn ? (longWait ? "warning" : "success") : undefined
                }
              >
                <Badge
                  color={
                    checkedIn ? (longWait ? "warning" : "success") : "primary"
                  }
                >
                  {checkedIn
                    ? longWait
                      ? "Longer wait · Demo queue"
                      : "Checked in · Demo queue"
                    : "Hospital check-in"}
                </Badge>
                <span className={s.eyebrow}>
                  {checkedIn ? "YOUR TOKEN NUMBER" : "READY FOR YOUR VISIT"}
                </span>
                {checkedIn ? (
                  <h1>{appointment.queue.token}</h1>
                ) : (
                  <h2>Let us know when you arrive</h2>
                )}
                <p>
                  {doctor?.name} · {doctor?.specialty}
                </p>
                <VisitType type={appointment.type} />
                <p>
                  <Icon name="location" bulk size={16} /> {hospital?.name} ·{" "}
                  {formatDate(appointment.date)} · {appointment.time}
                </p>
                {checkedIn && (
                  <div className={s.queueStats}>
                    <div>
                      <strong>{appointment.queue.ahead}</strong>
                      <small>patients ahead</small>
                    </div>
                    <div>
                      <strong>
                        ~{appointment.queue.minutes}
                        <em> min</em>
                      </strong>
                      <small>estimated wait</small>
                    </div>
                  </div>
                )}
              </div>
              <ErrorText>{error}</ErrorText>
              <Button
                fullWidth
                loading={busy}
                disabled={checkedIn || appointment.date !== dateKey()}
                onClick={() =>
                  run(async () => {
                    const position = await locateForCheckIn();
                    dispatch({
                      type: "CHECK_IN",
                      id: appointment.id,
                      position,
                    });
                    notify("Demo check-in complete. Your token is ready.");
                  })
                }
              >
                {checkedIn
                  ? "You’re checked in"
                  : appointment.date === dateKey()
                    ? "I have arrived · Check in"
                    : `Check-in opens ${formatDate(appointment.date)}`}
              </Button>
              {!checkedIn && (
                <Notice>
                  Allow location access at the hospital to generate your token.
                  Your location is checked once and is not saved. You can also
                  check in at reception.
                </Notice>
              )}
            </>
          )}
          {checkedIn && <SymptomPrompt visit={appointment} />}
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate("/hospital")}
          >
            Hospital information & directions
          </Button>
          {checkedIn && (
            <Notice>
              This is a demo token and estimated wait. Live queue allocation and
              updates require the hospital queue service.
            </Notice>
          )}
        </>
      ) : (
        <Empty
          icon="timer"
          title="No active queue"
          description="Your queue token will appear after you check in for a confirmed hospital visit."
          action="View appointments"
          onAction={() => navigate("/appointments")}
        />
      )}
    </div>
  );
}
