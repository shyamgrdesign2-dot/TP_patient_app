import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { locations, distanceKm } from "../config/brand";
import { doctors, formatDate, packages } from "../services/data";
import {
  Button,
  Badge,
  Avatar,
  Icon,
  IconButton,
  SectionTitle,
  BrandLogo,
  Sheet,
  Row,
  Notice,
  ErrorText,
} from "../components/ui";
import s from "../App.module.css";
export default function Home() {
  const { state, activeMember, brand, dispatch } = useApp();
  const navigate = useNavigate();
  const [locationOpen, setLocationOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState(null);
  const hospital = locations.find((l) => l.id === state.location);
  const appointment = state.appointments
    .filter((a) => a.memberId === activeMember.id && a.status === "Confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const doctor = doctors.find((d) => d.id === appointment?.doctorId);
  const records = state.records.filter((r) => r.memberId === activeMember.id);
  const unread = state.notifications.filter(
    (n) => !n.read && (!n.memberId || n.memberId === activeMember.id),
  ).length;
  const firstName = activeMember.name.split(" ")[0];
  const quick = [
    ["calendar-add", "Book a visit", "/doctors"],
    ["document-text", "My records", "/records"],
    ["timer", "My queue", "/queue"],
    ["receipt-2", "Pay bills", "/billing"],
  ];
  function findNearest() {
    setLocating(true);
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is unavailable. Choose your hospital below.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const closest = [...locations].sort(
          (a, b) =>
            distanceKm({ lat: p.coords.latitude, lng: p.coords.longitude }, a) -
            distanceKm({ lat: p.coords.latitude, lng: p.coords.longitude }, b),
        )[0];
        setNearest(closest.id);
        setLocating(false);
      },
      () => {
        setLocationError(
          "Could not access your location. You can choose a hospital below.",
        );
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }
  return (
    <div className={s.home}>
      <div className={s.homeTop}>
        <header className={s.greeting}>
          <div className={s.grow}>
            <span className={s.eyebrow}>A LITTLE CARE, EVERY DAY</span>
            <button
              onClick={() => setFamilyOpen(true)}
              className={s.greetingName}
            >
              Hello, {firstName} <Icon name="chevron-down" size={16} />
            </button>
          </div>
          <IconButton
            name="notification"
            label="Notifications"
            badge={unread}
            onClick={() => navigate("/notifications")}
          />
          <button
            className={s.avatarButton}
            aria-label="Switch family profile"
            onClick={() => setFamilyOpen(true)}
          >
            <Avatar name={activeMember.name} size={40} color="primary" />
          </button>
        </header>
        <button
          className={s.locationButton}
          onClick={() => setLocationOpen(true)}
        >
          <Icon name="location" size={16} bulk />
          <span>
            {brand.hospitalName}, <strong>{hospital.name}</strong>
          </span>
          <Icon name="chevron-down" size={12} />
        </button>
        <button
          className={s.healthCard}
          onClick={() => navigate("/profile")}
          aria-label="View your health card"
        >
          <div className={s.cardTop}>
            <BrandLogo light />
            <span className={s.cardChip}>
              <Icon name="shield-tick" size={14} /> HEALTH CARD
            </span>
          </div>
          <div className={s.cardPatient}>
            <span>CARE THAT KNOWS YOU</span>
            <h2>{activeMember.name}</h2>
            <p>
              Patient ID <strong>{activeMember.mrn}</strong>
            </p>
          </div>
          <div className={s.cardBottom}>
            <span>
              <Icon name="heart" size={16} bulk /> {activeMember.blood || "—"}{" "}
              <i /> {activeMember.relation}
            </span>
            <span>
              View health profile <Icon name="arrow-right" size={16} />
            </span>
          </div>
          <div className={s.cardOrb} aria-hidden="true" />
          <div className={s.cardOrb2} aria-hidden="true" />
        </button>
        <div className={s.cardCaption}>
          <span className={s.miniDot} /> Your care, all together{" "}
          <span className={s.carouselDots}>
            <i />
            <i />
          </span>
        </div>
      </div>
      <div className={s.homePanel}>
        <div className={s.sheetHandle} />
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
            <strong>Not sure where to start?</strong>
            <small>Let your care assistant help you book.</small>
          </span>
          <Icon name="arrow-right" size={20} />
        </button>
        <SectionTitle
          action="View all"
          onAction={() => navigate("/appointments")}
        >
          Your next visit
        </SectionTitle>
        {appointment ? (
          <div className={s.appointmentCard}>
            <div className={s.appointmentDate}>
              <span>
                <Icon name="calendar-1" size={16} />
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
                <Icon name="arrow-right" size={14} />
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
          Make time for your health
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
              Explore packages <Icon name="arrow-right" size={16} />
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
          Latest health records
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
          Care for your people
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
      <Sheet
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        title="Your hospital"
        description="Choose where you’d like to receive care."
      >
        <Button
          variant="tonal"
          leftIcon={<Icon name="gps" />}
          loading={locating}
          onClick={findNearest}
        >
          Find nearest location
        </Button>
        <ErrorText>{locationError}</ErrorText>
        {locations.map((l) => (
          <button
            className={s.selectionCard}
            key={l.id}
            data-selected={state.location === l.id}
            onClick={() => {
              dispatch({ type: "LOCATION", id: l.id });
              setLocationOpen(false);
            }}
          >
            <span className={s.rowIcon}>
              <Icon name="hospital" bulk />
            </span>
            <span className={s.grow}>
              <strong>
                {l.name}
                {nearest === l.id ? " · Nearest" : ""}
              </strong>
              <small>{l.address}</small>
              <small>{l.hours}</small>
            </span>
            <Icon
              name={state.location === l.id ? "tick-circle" : "chevron-right"}
            />
          </button>
        ))}
        <Notice>Locations shown are examples for this hospital preview.</Notice>
      </Sheet>
      <Sheet
        open={familyOpen}
        onClose={() => setFamilyOpen(false)}
        title="Who are we caring for?"
        description="Appointments and records follow the selected profile."
      >
        {state.members.map((m) => (
          <button
            className={s.selectionCard}
            key={m.id}
            data-selected={m.id === activeMember.id}
            onClick={() => {
              dispatch({ type: "SELECT_MEMBER", id: m.id });
              setFamilyOpen(false);
            }}
          >
            <Avatar name={m.name} size={44} />
            <span className={s.grow}>
              <strong>{m.name}</strong>
              <small>
                {m.relation} · {m.mrn}
              </small>
            </span>
            {m.id === activeMember.id && <Icon name="tick-circle" bulk />}
          </button>
        ))}
        <Button
          variant="outline"
          onClick={() => {
            setFamilyOpen(false);
            navigate("/family?add=1");
          }}
        >
          Manage family members
        </Button>
      </Sheet>
    </div>
  );
}
