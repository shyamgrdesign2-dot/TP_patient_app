import PatientHeader from "../components/PatientHeader";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { locations } from "../config/brand";
import { doctors, formatDate } from "../services/data";
import {
  Button,
  Badge,
  Avatar,
  Icon,
  SectionTitle,
  BrandLogo,
  Row,
} from "../components/ui";
import s from "../App.module.css";
export default function Home() {
  const { state, activeMember, brand, dispatch } = useApp();
  const navigate = useNavigate();
  const appointment = state.appointments
    .filter((a) => a.memberId === activeMember.id && a.status === "Confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const doctor = doctors.find((d) => d.id === appointment?.doctorId);
  const records = state.records.filter((r) => r.memberId === activeMember.id);
  const firstName = activeMember.name.split(" ")[0];
  const quick = [
    ["calendar-add", "Book a visit", "/doctors"],
    ["document-text", "My records", "/records"],
    ["timer", "My queue", "/queue"],
    ["bill", "Pay bills", "/billing"],
  ];
  return (
    <div className={s.home}>
      <div className={s.homeTop}>
        <PatientHeader />
        <section className={s.careHero} aria-label="Your care overview">
          <div className={s.careHeroCopy}>
            <span className={s.heroPill}>
              <Icon name="health" size={16} bulk /> YOUR EVERYDAY CARE
            </span>
            <h1>
              A little care.
              <br />A healthier you.
            </h1>
            <p>
              The right doctor, whenever
              <br />
              you need one.
            </p>
            <Button
              onClick={() => navigate("/doctors")}
              rightIcon={<Icon name="chevron-right" size={16} />}
            >
              Find a doctor
            </Button>
          </div>
          <img src="/images/care.jpg" alt="" className={s.careHeroPhoto} />
        </section>
      </div>
      <div className={s.homePanel}>
        <div className={s.quickActions}>
          {quick.map(([icon, label, path]) => (
            <button key={path} onClick={() => navigate(path)}>
              <span className={s.quickIcon}>
                <Icon name={icon} bulk size={24} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button className={s.agentStrip} onClick={() => navigate("/assistant")}>
          <span className={s.agentIcon}>
            <Icon name="magic-star" size={24} bulk />
          </span>
          <span className={s.grow}>
            <strong>Let’s find your next step</strong>
            <small>Talk to your care assistant</small>
          </span>
          <Icon name="chevron-right" size={20} />
        </button>
        <SectionTitle
          action="View all"
          onAction={() => navigate("/appointments")}
        >
          Coming up
        </SectionTitle>
        {appointment ? (
          <div className={s.appointmentCard}>
            <div className={s.appointmentDate}>
              <span>
                <Icon name="calendar-2" size={16} />
                {formatDate(appointment.date, { weekday: "short" })} <i />{" "}
                {appointment.time}
              </span>
              <Badge color="success" size="sm">
                Confirmed
              </Badge>
            </div>
            <div className={s.doctorRow}>
              <Avatar
                src={doctor.image}
                name={doctor.name}
                size={56}
                shape="rounded"
              />
              <div className={s.grow}>
                <h3>{doctor.name}</h3>
                <p>{doctor.specialty}</p>
                <small>
                  {appointment.source === "Hospital"
                    ? "Booked by your hospital"
                    : `For ${firstName}`}{" "}
                  · {appointment.type}
                </small>
              </div>
            </div>
            <div className={s.appointmentBottom}>
              <span>
                <Icon name="location" size={14} />
                {locations.find((l) => l.id === appointment.location).name}
              </span>
              <Button
                variant="tonal"
                size="sm"
                onClick={() =>
                  navigate(appointment.queue ? "/queue" : "/appointments")
                }
              >
                {appointment.queue ? "View queue" : "View appointment"}
                <Icon name="chevron-right" size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div className={s.softCard}>
            <h3>Your next step to feeling better.</h3>
            <p>Find the right doctor for you.</p>
            <Button variant="tonal" onClick={() => navigate("/doctors")}>
              Book an appointment
            </Button>
          </div>
        )}
        <SectionTitle action="Explore" onAction={() => navigate("/packages")}>
          Stay a step ahead
        </SectionTitle>
        <button
          className={s.packageBanner}
          onClick={() => navigate("/packages")}
        >
          <div>
            <span className={s.eyebrow}>PREVENTIVE CARE</span>
            <h3>
              A little check-in.
              <br />A healthier you.
            </h3>
            <p>Health checks from ₹1,499</p>
            <span className={s.inlineLink}>
              Explore packages <Icon name="chevron-right" size={16} />
            </span>
          </div>
          <div className={s.packageArt}>
            <Icon name="health" size={64} bulk />
            <span>
              <Icon name="tick-circle" size={18} bulk /> Made for you
            </span>
          </div>
        </button>
        <SectionTitle action="View all" onAction={() => navigate("/records")}>
          Your latest records
        </SectionTitle>
        <div className={s.rowCard}>
          {records.slice(0, 2).map((record) => (
            <Row
              key={record.id}
              icon={
                record.category === "Prescriptions"
                  ? "document-text"
                  : "clipboard-tick"
              }
              title={record.title}
              subtitle={`${formatDate(record.date)} · ${record.category}`}
              onClick={() => navigate(`/records?record=${record.id}`)}
              trailing={record.new ? <Badge size="sm">New</Badge> : null}
            />
          ))}
        </div>
        <SectionTitle action="Manage" onAction={() => navigate("/family")}>
          Your family
        </SectionTitle>
        <div className={s.familyMini}>
          {state.members.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                dispatch({ type: "SELECT_MEMBER", id: m.id });
              }}
              data-active={m.id === activeMember.id}
            >
              <Avatar
                name={m.name}
                size={44}
                color={m.id === activeMember.id ? "primary" : "slate"}
              />
              <strong>{m.name.split(" ")[0]}</strong>
              <small>{m.relation}</small>
            </button>
          ))}
          <button onClick={() => navigate("/family?add=1")}>
            <span className={s.addCircle}>
              <Icon name="add" />
            </span>
            <strong>Add new</strong>
            <small>Family</small>
          </button>
        </div>
        <div className={s.homeFooter}>
          <BrandLogo symbol />
          <p>Here for you. Every step of the way.</p>
          <small>Interactive demo · Sample data</small>
        </div>
      </div>
    </div>
  );
}
