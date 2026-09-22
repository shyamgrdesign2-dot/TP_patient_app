import { useEffect, useRef } from "react";
import CareCarousel from "../components/CareCarousel";
import PatientHeader from "../components/PatientHeader";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { formatDate } from "../services/data";
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
  const banner = useRef(null);
  const panel = useRef(null);
  useEffect(() => {
    const scroller = panel.current.closest("main");
    // Covered cards must not remain keyboard targets behind the foreground sheet.
    const update = () => {
      const covered =
        panel.current.getBoundingClientRect().top <
        banner.current.getBoundingClientRect().bottom - 8;
      banner.current.inert = covered;
    };
    scroller.addEventListener("scroll", update, { passive: true });
    update();
    return () => scroller.removeEventListener("scroll", update);
  }, []);
  const records = state.records.filter((r) => r.memberId === activeMember.id);
  const abhaLinked = state.healthLinks?.[activeMember.id]?.abha;
  const quick = [
    ["calendar-2", "Book Appointment", "/doctors"],
    ["document-text", "My Records", "/records"],
    ["timer", "Queue", "/queue"],
    ["bill", "My Bills", "/billing"],
  ];
  return (
    <div className={s.home}>
      <PatientHeader />
      <h1 className={s.srOnly}>Your care home</h1>
      <div className={s.homeTop} ref={banner}>
        <CareCarousel key={activeMember.id} />
      </div>
      <div className={s.homePanel} ref={panel}>
        <div className={s.homeSheetTop} aria-hidden="true">
          <span className={s.homeSheetGrip} />
        </div>
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
        <SectionTitle>Your health identity</SectionTitle>
        <section
          className={s.homeIdentityCard}
          aria-label="ABHA and hospital identity"
        >
          <div className={s.doctorRow}>
            <span className={s.rowIcon}>
              <Icon name="shield-tick" size={24} bulk />
            </span>
            <div className={s.grow}>
              <h3>
                {abhaLinked
                  ? "Your ABHA is linked"
                  : "One ABHA. Connected care."}
              </h3>
              <p>
                {abhaLinked
                  ? "Demo connection for this profile"
                  : "Create an account or link your existing ABHA."}
              </p>
            </div>
          </div>
          <div className={s.identityActions}>
            {abhaLinked ? (
              <Button
                variant="tonal"
                fullWidth
                onClick={() => navigate("/link-records")}
              >
                Manage linked identities
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate("/abha")}>Link ABHA</Button>
                <Button
                  href="https://abha.abdm.gov.in/abha/v3/"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  rightIcon={<Icon name="export" size={14} />}
                >
                  Create ABHA
                </Button>
              </>
            )}
          </div>
          {!abhaLinked && (
            <small className={s.creationHint}>
              Creation opens the official ABDM portal.
            </small>
          )}
          <button
            className={s.uhidHomeLink}
            onClick={() => navigate("/link-records")}
          >
            <Icon name="hospital" size={18} bulk />
            <span>
              Have a hospital UHID? <strong>Link it here</strong>
            </span>
            <Icon name="chevron-right" size={16} />
          </button>
        </section>
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
