import { useState } from "react";
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
import { locations } from "../config/brand";
import { download, calendarFile } from "../services/files";
import {
  Button,
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
      <PageHeader
        title="Find your doctor"
        subtitle="The right care starts with the right person."
      />
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
          <Button fullWidth onClick={() => navigate(`/book/${selected?.id}`)}>
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
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { doctorId } = useParams();
  const doctor = doctors.find((d) => d.id === doctorId);
  const [step, setStep] = useState(0);
  const [memberId, setMemberId] = useState(activeMember.id);
  const [date, setDate] = useState(dateKey(1));
  const [time, setTime] = useState("");
  const [type, setType] = useState("In-person");
  const [reason, setReason] = useState(params.get("reason") || "");
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
        reason,
        source: "Patient",
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
        <PageHeader title="You’re all booked" back={false} />
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
            <dd>{member.name}</dd>
            <dt>When</dt>
            <dd>
              {formatDate(date)} · {time}
            </dd>
            <dt>Where</dt>
            <dd>{locations.find((l) => l.id === location).name}</dd>
            <dt>Visit type</dt>
            <dd>{type}</dd>
            <dt>Payment</dt>
            <dd>{money(doctor.fee)} · Pay at hospital</dd>
          </dl>
        </div>
        <Notice icon="calendar-tick">
          Please arrive 15 minutes before your appointment and bring any
          previous reports.
        </Notice>
        <Button fullWidth onClick={() => navigate("/appointments")}>
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
        <p className={s.footnote}>
          Demo booking · No hospital appointment has been created.
        </p>
      </div>
    );
  return (
    <div className={s.page}>
      <PageHeader title="Book an appointment" />
      <div className={s.steps}>
        {["Your visit", "Details", "Confirm"].map((text, i) => (
          <span key={text} data-active={step >= i}>
            <b>{step > i ? "✓" : i + 1}</b>
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
            options={["In-person", "Video consultation"]}
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
          <Field
            label="Reason for your visit (optional)"
            autoGrow
            maxLength={600}
            placeholder="Tell the doctor a little about what brings you in."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
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
              <dd>{member.name}</dd>
              <dt>Doctor</dt>
              <dd>{doctor.name}</dd>
              <dt>Date</dt>
              <dd>{formatDate(date, { weekday: "long" })}</dd>
              <dt>Time</dt>
              <dd>{time} IST</dd>
              <dt>Hospital</dt>
              <dd>{locations.find((l) => l.id === location).name}</dd>
              <dt>Visit</dt>
              <dd>{type}</dd>
              {reason && (
                <>
                  <dt>Reason</dt>
                  <dd>{reason}</dd>
                </>
              )}
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
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Upcoming");
  const [selected, setSelected] = useState(null);
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
        subtitle="Every appointment, in one place."
        back={false}
        action={
          <Button size="sm" onClick={() => navigate("/doctors")}>
            <Icon name="add" size={18} />
            Book
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
                onClick={() => setSelected(a)}
              >
                <Avatar src={d.image} name={d.name} size={56} shape="rounded" />
                <span className={s.grow}>
                  <h3>{d.name}</h3>
                  <p>{d.specialty}</p>
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
                  variant="tonal"
                  size="sm"
                  onClick={() =>
                    a.queue && a.status === "Confirmed"
                      ? navigate("/queue")
                      : setSelected(a)
                  }
                >
                  {a.queue && a.status === "Confirmed"
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
                  <dd>{activeMember.name}</dd>
                  <dt>Visit type</dt>
                  <dd>{selected.type}</dd>
                  <dt>Reason</dt>
                  <dd>{selected.reason || "Not provided"}</dd>
                  <dt>Booked by</dt>
                  <dd>{selected.source}</dd>
                </dl>
                {refreshSelected.status === "Confirmed" && (
                  <>
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
                  </>
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
  const { state, activeMember, dispatch, notify } = useApp();
  const navigate = useNavigate();
  const appointment = state.appointments.find(
    (a) =>
      a.memberId === activeMember.id && a.status === "Confirmed" && a.queue,
  );
  const doctor = doctors.find((d) => d.id === appointment?.doctorId);
  return (
    <div className={s.page}>
      <PageHeader
        title="Your place in line"
        subtitle="A little less waiting. A little more clarity."
      />
      <MemberContext />
      {appointment ? (
        <>
          <div className={s.queueCard}>
            <Badge color="success" icon={<Icon name="activity" size={12} />}>
              Demo queue
            </Badge>
            <span className={s.eyebrow}>YOUR TOKEN NUMBER</span>
            <h1>{appointment.queue.token}</h1>
            <p>
              {doctor.name} · {doctor.specialty}
            </p>
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
          </div>
          <div className={s.timeline}>
            {[
              {
                title: "Appointment confirmed",
                sub: `${formatDate(appointment.date)} at ${appointment.time}`,
                done: true,
              },
              {
                title: "Check in at the hospital",
                sub: appointment.queue.checkedIn
                  ? "You’re checked in"
                  : "Let reception know you’ve arrived",
                done: appointment.queue.checkedIn,
              },
              {
                title: "Your consultation",
                sub: appointment.queue.room,
                done: false,
              },
            ].map((item, i) => (
              <div key={item.title} data-done={item.done}>
                <span>
                  {item.done ? (
                    <Icon name="tick-circle" bulk size={24} />
                  ) : (
                    i + 1
                  )}
                </span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
          <Button
            fullWidth
            disabled={appointment.queue.checkedIn}
            onClick={() => {
              dispatch({ type: "CHECK_IN", id: appointment.id });
              notify("Demo check-in complete.");
            }}
          >
            {appointment.queue.checkedIn
              ? "You’re checked in"
              : "I’ve arrived · Check in"}
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate("/hospital")}
          >
            Hospital information & directions
          </Button>
          <Notice>
            Wait times are estimates and may change for urgent cases. This
            preview shows a sample queue; live updates require the hospital
            queue service.
          </Notice>
        </>
      ) : (
        <Empty
          icon="timer"
          title="No active queue"
          description="Your queue token will appear when the hospital opens check-in for your visit."
          action="View appointments"
          onAction={() => navigate("/appointments")}
        />
      )}
    </div>
  );
}
