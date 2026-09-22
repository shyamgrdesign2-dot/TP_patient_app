import { useEffect, useRef } from "react";
import SpotlightCard from "../components/effects/SpotlightCard";
import CareCarousel from "../components/CareCarousel";
import PatientHeader from "../components/PatientHeader";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { formatDate } from "../services/data";
import {
  Button,
  PatientName,
  AbhaLogo,
  Badge,
  Avatar,
  Icon,
  SectionTitle,
  BrandLogo,
  Row,
} from "../components/ui";
import shared from "../App.module.css";
import home from "../Home.module.css";
const s = { ...shared, ...home };
export default function Home() {
  const { state, activeMember, dispatch } = useApp();
  const navigate = useNavigate();
  const banner = useRef(null);
  const panel = useRef(null);
  const drag = useRef(null);
  useEffect(() => {
    const scroller = panel.current.closest("main");
    // Covered cards must not remain keyboard targets behind the foreground sheet.
    const update = () => {
      const covered =
        panel.current.getBoundingClientRect().top <
        banner.current.getBoundingClientRect().bottom - 8;
      banner.current.inert = covered;
      panel.current.dataset.scrolled = String(scroller.scrollTop > 8);
    };
    scroller.addEventListener("scroll", update, { passive: true });
    update();
    return () => scroller.removeEventListener("scroll", update);
  }, []);
  const records = state.records.filter((r) => r.memberId === activeMember.id);
  const abhaLinked = state.healthLinks?.[activeMember.id]?.abha;
  const quick = [
    ["calendar-2", "Book visit", "/doctors"],
    ["document-text", "My Records", "/records"],
    ["timer", "Queue", "/queue"],
    ["bill", "My Bills", "/billing"],
  ];
  return (
    <div className={s.home}>
      <PatientHeader />
      <div className={s.homeTop} ref={banner}>
        <CareCarousel key={activeMember.id} />
      </div>
      <div className={s.homePanel} ref={panel}>
        <button
          className={s.homeSheetTop}
          aria-label="Scroll care services"
          onClick={() => {
            const main = panel.current.closest("main");
            main.scrollTo({
              top:
                main.scrollTop +
                panel.current.getBoundingClientRect().top -
                main.getBoundingClientRect().top -
                72,
              behavior: "smooth",
            });
          }}
          onPointerDown={(event) => {
            drag.current = {
              y: event.clientY,
              scroll: panel.current.closest("main").scrollTop,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current)
              panel.current.closest("main").scrollTop =
                drag.current.scroll + drag.current.y - event.clientY;
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <span className={s.homeSheetGrip} />
        </button>
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
        <SpotlightCard
          as="button"
          className={s.agentStrip}
          onClick={() => navigate("/assistant")}
        >
          <span className={s.agentIcon}>
            <Icon name="magic-star" size={24} bulk />
          </span>
          <span className={s.grow}>
            <strong>Let’s find the right care</strong>
            <small>Ask your care assistant</small>
          </span>
          <Icon name="chevron-right" size={20} />
        </SpotlightCard>
        <SectionTitle
          className={s.sectionHeading}
          action="View all"
          onAction={() => navigate("/records")}
        >
          Your latest records
        </SectionTitle>
        <div className={s.recordsList}>
          {!records.length && (
            <Row
              icon="document-text"
              title="No records yet"
              subtitle="Add a report or link your hospital ID"
              onClick={() => navigate("/records")}
            />
          )}
          {records.slice(0, 2).map((record) => (
            <Row
              key={record.id}
              icon={
                record.category === "Prescriptions"
                  ? "document-text"
                  : "clipboard-tick"
              }
              title={
                <span className={s.recordHeading}>
                  {record.title}
                  {record.new && <Badge size="sm">New</Badge>}
                </span>
              }
              subtitle={`${formatDate(record.date)} · ${record.category}`}
              onClick={() => navigate(`/records?record=${record.id}`)}
            />
          ))}
        </div>
        <SectionTitle className={s.sectionHeading}>
          Connected health
        </SectionTitle>
        <section
          className={s.homeIdentityCard}
          aria-label="ABHA and hospital identity"
        >
          <div className={s.doctorRow}>
            <span className={s.rowIcon}>
              <AbhaLogo />
            </span>
            <div className={s.grow}>
              <h3>
                {abhaLinked
                  ? "Your ABHA is linked"
                  : "Your health, in one place"}
              </h3>
              <p>
                {abhaLinked
                  ? "Demo connection for this profile"
                  : "Connect your ABHA to this profile."}
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
                >
                  Create ABHA
                </Button>
              </>
            )}
          </div>
        </section>
        <SectionTitle
          className={s.sectionHeading}
          action="Explore"
          onAction={() => navigate("/packages")}
        >
          Stay a step ahead
        </SectionTitle>
        <button
          className={s.wellnessCard}
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
          <img
            src="/images/care.jpg"
            alt=""
            className={s.wellnessPhoto}
            loading="lazy"
          />
        </button>
        <SectionTitle
          className={s.sectionHeading}
          action="Manage"
          onAction={() => navigate("/family")}
        >
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
              <strong>
                <PatientName member={m}>{m.name.split(" ")[0]}</PatientName>
              </strong>
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
