import BrandHeaderPattern from "../components/BrandHeaderPattern";
import banner from "../components/BrandHeader.module.css";
import SegmentedControl from "../components/SegmentedControl";
import VisitDocumentSheet from "../components/VisitDocumentSheet";
import { AiSpark } from "../components/AiNote";
import { useEffect, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
  useParams,
} from "react-router-dom";
import {
  ConfirmDialog,
  Chip,
  Divider,
  Tabs,
  TabsList,
  TabsTrigger,
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
  Meta,
  Sep,
  useAction,
} from "../components/ui";
import s from "../App.module.css";
import a from "./Appointments.module.css";
import records from "./Records.module.css";
import v from "../components/VisitExperience.module.css";
import VisitType from "../components/VisitType";
import { MemberForm } from "../components/MemberForm";
import { memberMeta } from "../../shared/age";
import BookingAssistant from "../components/booking/BookingAssistant";
import VisitSummary from "../components/booking/VisitSummary";
import {
  useBookVisit,
  clinicFor,
  videoEnabled,
} from "../components/booking/useBookVisit";
import b from "../components/booking/Booking.module.css";
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
function VisitStatusIcon({ status, selected }) {
  return (
    <Icon
      name={
        {
          Upcoming: "calendar-2",
          Past: "calendar-tick",
          Cancelled: "calendar-remove",
        }[status]
      }
      size={16}
      bulk={selected}
    />
  );
}

export function Doctors() {
  const { state } = useApp();
  const [bookingParams] = useSearchParams();
  const bookingMode =
    bookingParams.get("mode") === "manual" ? "?mode=manual" : "";
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
        brandBanner
        trailing={<LocationChip />}
      />
      <MemberContext />
      {!bookingMode && (
        <button
          type="button"
          className={b.option}
          data-ai
          onClick={() => navigate("/book?mode=assistant")}
        >
          <span className={b.optionIcon}>
            <AiSpark size={22} />
          </span>
          <span className={s.grow}>
            <strong>Book with AI assistant</strong>
            <small>Help finding a doctor and a time that suits you.</small>
          </span>
          <Icon name="chevron-right" size={16} />
        </button>
      )}
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
                <h2 className={s.cardTitle}>{d.name}</h2>
                <span className={s.education}>
                  {d.qualification.split(" · ")[0]}, {d.specialty}
                </span>
              </span>
              <Icon name="chevron-right" size={16} />
            </button>
            <div className={s.doctorMeta}>
              <span>{d.experience} y exp</span>
              <Sep />
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
                size="sm"
                leftIcon={<Icon name="add-plain" size={18} />}
                onClick={() => navigate(`/book/${d.id}${bookingMode}`)}
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
            leftIcon={<Icon name="add-plain" size={18} />}
            onClick={() => {
              setSelected(null);
              navigate(`/book/${selected?.id}${bookingMode}`);
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
// Compact doctor card at the top of every booking screen.
function BookingDoctor({ doctor }) {
  return (
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
        <h2>
          <DoctorName doctor={doctor} />
        </h2>
        <p>{doctor.specialty}</p>
      </div>
      {feeFor(doctor) != null && (
        <strong aria-label={`Consultation fee ${money(feeFor(doctor))}`}>
          {money(feeFor(doctor))}
        </strong>
      )}
    </div>
  );
}
// Booking for one doctor. The way of booking lives in the URL (?mode=), is
// offered for every new booking; switching preserves any existing answers.
export function Booking() {
  const navigate = useNavigate();
  const { doctorId } = useParams();
  const [params] = useSearchParams();
  const routeState = useLocation().state;
  const doctor = doctors.find((d) => d.id === doctorId);
  if (!doctor)
    return (
      <div className={s.page}>
        <PageHeader title="Book a visit" />
        <Empty
          title="Doctor not found"
          description="Choose a doctor from the hospital directory."
          action={[
            <Icon key="add" name="add-plain" size={18} />,
            "Book appointment",
          ]}
          onAction={() => navigate("/doctors")}
        />
      </div>
    );
  const mode = params.get("mode");
  const path = (next) => `/book/${doctor.id}?mode=${next}`;
  // Replaces the current entry, so Back always leaves booking in one step.
  function choose(next, extra) {
    navigate(path(next), {
      replace: true,
      state: { ...routeState, prefill: undefined, ...extra },
    });
  }
  if (mode === "assistant")
    return (
      <BookingAssistant
        key={doctor.id}
        doctor={doctor}
        intake={routeState}
        onManual={({ memberId, type, date, time }) =>
          choose("manual", { prefill: { memberId, type, date, time } })
        }
      />
    );
  if (mode === "manual")
    return <ManualBooking key={doctor.id} doctor={doctor} />;
  return (
    <div className={s.page}>
      <PageHeader title="Book an appointment" />
      <BookingDoctor doctor={doctor} />
      <Sheet
        open
        onClose={() => navigate("/doctors")}
        title="How would you like to book?"
      >
        <section className={b.chooser}>
          <button
            type="button"
            className={b.option}
            data-ai
            onClick={() => choose("assistant")}
          >
            <span className={b.optionIcon} aria-hidden="true">
              <AiSpark size={24} />
            </span>
            <span className={s.grow}>
              <strong>Book with AI assistant</strong>
              <small>Chat or speak. Mira books it for you.</small>
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
          <button
            type="button"
            className={b.option}
            onClick={() => choose("manual")}
          >
            <span className={b.optionIcon} aria-hidden="true">
              <Icon name="calendar-2" size={24} bulk />
            </span>
            <span className={s.grow}>
              <strong>Book manually</strong>
              <small>Pick the day, time and patient yourself.</small>
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
          <p className={b.chooserNote}>You can switch at any time.</p>
        </section>
      </Sheet>
    </div>
  );
}
function ManualBooking({ doctor }) {
  const { state, activeMember } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const routeState = location.state;
  const prefill = routeState?.prefill || {};
  const video = videoEnabled();
  const [memberId, setMemberId] = useState(
    state.members.some((m) => m.id === prefill.memberId)
      ? prefill.memberId
      : activeMember.id,
  );
  const [date, setDate] = useState(
    prefill.date >= dateKey(1) ? prefill.date : dateKey(1),
  );
  const [time, setTime] = useState(
    prefill.date >= dateKey(1) && prefill.time ? prefill.time : "",
  );
  const [type, setType] = useState(
    video && prefill.type === "Video consultation"
      ? "Video consultation"
      : "In-person",
  );
  const [addingMember, setAddingMember] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { book, confirming } = useBookVisit();
  const { busy, error, run, setError } = useAction();
  // The step lives in the URL, so browser Back walks the steps too. A step
  // reached without a chosen time (a refresh) starts again from the top.
  const wanted = Math.min(2, Math.max(0, Number(params.get("step")) || 0));
  const step = time ? wanted : 0;
  const stepPath = (n) =>
    `/book/${doctor.id}?mode=manual${n ? `&step=${n}` : ""}`;
  useEffect(() => {
    if (wanted !== step)
      navigate(stepPath(step), { replace: true, state: routeState });
  }, [wanted, step]);
  const member = state.members.find((m) => m.id === memberId);
  const clinic = clinicFor(doctor, state.location);
  const booked = state.appointments
    .filter(
      (a) =>
        a.doctorId === doctor.id && a.date === date && a.status === "Confirmed",
    )
    .map((a) => a.time);
  return (
    <div className={s.page}>
      <PageHeader title="Book an appointment" />
      <BookingDoctor doctor={doctor} />
      <BookingStep
        title="When"
        open={step === 0}
        done={step > 0}
        onEdit={() => navigate(-step)}
        leaving={leaving && step === 0}
        kind={
          <>
            <Icon
              name={type === "Video consultation" ? "video" : "hospital"}
              family={
                type === "Video consultation" ? "video-audio-image" : "building"
              }
              corner="rounded"
              size={16}
              bulk
            />
            {type === "Video consultation" ? "Video consultation" : "In clinic"}
          </>
        }
        summary={
          <Meta>
            {formatDate(date, { weekday: "short" })}
            {`${time} IST`}
          </Meta>
        }
      >
        <div className={s.sectionLabel}>
          {video && (
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
          )}
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
          onEdit={() => navigate(1 - step)}
          leaving={leaving && step === 1}
          kind={
            <>
              <Icon name="user" size={16} />
              {member.relation}
            </>
          }
          summary={
            <Meta
              items={[
                <PatientName key="name" member={member} />,
                ...memberMeta(member),
              ]}
            />
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
        <>
          <VisitSummary
            visit={{ doctorId: doctor.id, location: clinic, date, time, type }}
            member={member}
          />
          <p className={s.footnote}>
            You can reschedule or cancel from My visits.
          </p>
        </>
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
          disabled={leaving || (step === 0 && !time)}
          loading={busy}
          onClick={() => {
            setError("");
            if (step === 2)
              return run(() =>
                book({
                  doctor,
                  memberId,
                  date,
                  time,
                  type,
                  intake: routeState,
                  stepsBack: step,
                }),
              );
            // Collapse the open section, then reveal its summary card.
            setLeaving(true);
            setTimeout(
              () => {
                navigate(stepPath(step + 1), { state: routeState });
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
// Stacked radio cards: name (relation), age and gender, selection mark.
function PatientPicker({ members, value, onChange }) {
  return (
    <div
      className={s.patientPicker}
      role="radiogroup"
      aria-label="Who is this visit for?"
    >
      <h2 className={s.fieldLabel}>Who is this visit for?</h2>
      {members.map((m, index) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          tabIndex={value === m.id ? 0 : -1}
          onKeyDown={(event) => {
            const direction = {
              ArrowRight: 1,
              ArrowDown: 1,
              ArrowLeft: -1,
              ArrowUp: -1,
            }[event.key];
            if (!direction && event.key !== "Home" && event.key !== "End")
              return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? members.length - 1
                  : (index + direction + members.length) % members.length;
            onChange(members[next].id);
            const radioButtons =
              event.currentTarget.parentElement.querySelectorAll(
                '[role="radio"]',
              );
            radioButtons[next]?.focus();
          }}
          className={s.patientOption}
          onClick={() => onChange(m.id)}
        >
          <Avatar name={m.name} size={40} color="primary" />
          <span className={s.grow}>
            <strong>
              <PatientName member={m} /> <span>({m.relation})</span>
            </strong>
            <small>
              <Meta items={memberMeta(m)} />
            </small>
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
        leftIcon={<Icon name="add-plain" size={18} />}
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
                <Meta>
                  {doctor.specialty}
                  {visit.time}
                </Meta>
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
    <article className={`${s.appointmentCard} ${a.card} ${className}`}>
      <div className={`${s.appointmentDate} ${a.cardDate}`}>
        <span>
          <Icon name="calendar-2" size={16} bulk />
          <Meta>
            {formatDate(visit.date)}
            {visit.time}
          </Meta>
        </span>
        <Status status={visit.status} />
      </div>
      <button
        className={`${s.doctorProfileButton} ${a.cardProfile}`}
        aria-label={`View appointment with ${d.name}`}
        onClick={onDetails}
      >
        <Avatar
          src={d.image}
          name={d.name.replace("Dr. ", "")}
          size={48}
          shape="rounded"
          radius={12}
          color="primary"
        />
        <span className={s.grow}>
          <h2 className={s.cardTitle}>
            <DoctorName doctor={d} />
          </h2>
          <span className={s.cardSubtitle}>{d.specialty}</span>
        </span>
        <Icon name="chevron-right" size={16} />
      </button>
      <div className={`${s.appointmentBottom} ${a.cardBottom}`}>
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
      : requested?.status === "Cancelled" ||
          visitParams.get("tab") === "cancelled"
        ? "Cancelled"
        : "Upcoming",
  );
  const [selected, setSelected] = useState(requested || null);
  const [previousMemberId, setPreviousMemberId] = useState(activeMember.id);
  const [cancel, setCancel] = useState(null);
  const [joining, setJoining] = useState(null);
  const [document, setDocument] = useState(null);
  const [reschedule, setReschedule] = useState(false);
  const [date, setDate] = useState(dateKey(1));
  const [time, setTime] = useState("");
  const { error, run, setError } = useAction();
  const statuses = {
    Upcoming: "Confirmed",
    Past: "Completed",
    Cancelled: "Cancelled",
  };
  const memberVisits = state.appointments.filter(
    (a) => a.memberId === activeMember.id,
  );
  const counts = Object.fromEntries(
    Object.entries(statuses).map(([label, status]) => [
      label,
      memberVisits.filter((a) => a.status === status).length,
    ]),
  );
  const items = memberVisits.filter((a) => a.status === statuses[tab]);
  useEffect(() => {
    if (previousMemberId === activeMember.id) return;
    setPreviousMemberId(activeMember.id);
    setSelected(null);
    setDocument(null);
    setCancel(null);
    setJoining(null);
    setReschedule(false);
  }, [activeMember.id]);
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
            r.released !== false &&
            r.memberId === refreshSelected.memberId &&
            (r.appointmentId === refreshSelected.id ||
              (!r.appointmentId &&
                r.doctorId === refreshSelected.doctorId &&
                r.date === refreshSelected.date)),
        )
      : null;
  const bill =
    refreshSelected?.status === "Completed"
      ? state.bills.find((b) => b.appointmentId === refreshSelected.id)
      : null;
  const rescheduleSlots = slots.filter(
    (slot) =>
      !state.appointments.some(
        (a) =>
          a.id !== selected?.id &&
          a.doctorId === selected?.doctorId &&
          a.date === date &&
          a.time === slot &&
          a.status === "Confirmed",
      ),
  );
  return (
    <div className={s.page}>
      <div className={banner.group}>
        <BrandHeaderPattern />
        <PageHeader
          title="My visits"
          brandBanner
          brandPattern={false}
          patientSelector
          action={
            items.length > 0 && (
              <Button size="sm" onClick={() => navigate("/book")}>
                <Icon name="add" size={18} />
                Book new appointment
              </Button>
            )
          }
        />
        <div
          className={`${s.visitControls} ${banner.band} ${records.recordsBand} ${a.appointmentTabs}`}
        >
          <Tabs
            value={tab}
            onValueChange={setTab}
            size="sm"
            variant="underline"
          >
            <TabsList aria-label="Appointment status">
              {["Upcoming", "Past", "Cancelled"].map((status) => (
                <TabsTrigger
                  key={status}
                  value={status}
                  tag={counts[status]}
                  onFocus={(event) =>
                    event.currentTarget.scrollIntoView({
                      block: "nearest",
                      inline: "nearest",
                      behavior: "instant",
                    })
                  }
                  leftIcon={
                    <VisitStatusIcon
                      status={status}
                      selected={tab === status}
                    />
                  }
                  id={`appointments-tab-${status}`}
                  aria-controls="appointments-panel"
                >
                  {status}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div
        role="tabpanel"
        id="appointments-panel"
        aria-labelledby={`appointments-tab-${tab}`}
      >
        <div
          className={`${s.stack} ${a.visitList}`}
          aria-label={`${tab} appointments`}
        >
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
            action={[
              <Icon key="add" name="add-plain" size={18} />,
              "Book new appointment",
            ]}
            onAction={() => navigate("/book")}
          />
        )}
      </div>
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
            <div className={`${s.doctorRow} ${a.detailsDoctor}`}>
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
                <span className={a.detailsStatus}>
                  <Status status={refreshSelected.status} />
                </span>
              </div>
            </div>
            {!reschedule ? (
              <>
                <dl className={a.details}>
                  {[
                    [
                      "Date & time",
                      <Meta key="when">
                        {formatDate(refreshSelected.date)}
                        {refreshSelected.time}
                      </Meta>,
                    ],
                    [
                      "Patient",
                      <PatientName key="patient" member={activeMember} />,
                    ],
                    [
                      "Visit type",
                      <VisitType key="type" type={selected.type} />,
                    ],
                    ...(!isVideo(selected)
                      ? [
                          [
                            "Location",
                            locations.find((l) => l.id === selected.location)
                              ?.name || "Hospital",
                          ],
                        ]
                      : []),
                    ["Appointment ID", selected.id],
                    ["Booked by", selected.source],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
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
                    <Button
                      onClick={() => {
                        setDate(
                          refreshSelected.date >= dateKey(1)
                            ? refreshSelected.date
                            : dateKey(1),
                        );
                        setTime("");
                        setError("");
                        setReschedule(true);
                      }}
                    >
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
                        onClick={() => setDocument(prescription)}
                      >
                        <Icon name="document-text" size={18} />
                        View Rx
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!bill}
                        onClick={() =>
                          setDocument({
                            id: bill.id,
                            title: bill.title,
                            date: bill.date,
                            author: "Hospital billing",
                            bill,
                          })
                        }
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
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setReschedule(false)}
                  leftIcon={<Icon name="chevron-left" size={16} />}
                >
                  Back to appointment details
                </Button>
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
                  {!rescheduleSlots.length && (
                    <p role="status" className={s.metaText}>
                      No times are available on this day. Choose another date.
                    </p>
                  )}
                  <SlotPicker
                    options={rescheduleSlots}
                    value={time}
                    onChange={setTime}
                  />
                </div>
                <Button
                  disabled={!time || !date || date < dateKey(1)}
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
      <VisitDocumentSheet
        document={document}
        onClose={() => setDocument(null)}
      />
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
