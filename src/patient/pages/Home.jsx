import { useEffect, useMemo, useRef } from "react";
import { recordPath } from "../services/records.js";
import CareCarousel from "../components/CareCarousel";
import PatientHeader from "../components/PatientHeader";
import { useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { formatDate, money } from "../../shared/data";
import { listedCatalog, packagesEnabled } from "../../shared/catalog";
import { PackageCard, ItemCover } from "./Packages";
import { AppointmentCard } from "./Appointments";
import packageStyles from "./Packages.module.css";
import {
  Button,
  PatientName,
  AbhaLogo,
  Badge,
  Avatar,
  Icon,
  Meta,
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
  const dragged = useRef(false);
  useEffect(() => {
    const scroller = panel.current.closest("main");
    // Covered cards must not remain keyboard targets behind the foreground sheet.
    const update = () => {
      // A late scroll event can arrive after leaving Home.
      if (!panel.current || !banner.current) return;
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
  const records = state.records
    .filter((r) => r.memberId === activeMember.id && r.released !== false)
    .sort((a, b) =>
      `${b.date || ""} ${b.time || ""}`.localeCompare(
        `${a.date || ""} ${a.time || ""}`,
      ),
    );
  const abhaLinked = state.healthLinks?.[activeMember.id]?.abha;
  const past = state.appointments
    .filter((a) => a.memberId === activeMember.id && a.status === "Completed")
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const showPackages = packagesEnabled();
  const healthPackages = useMemo(
    () => (showPackages ? listedCatalog().packages : []),
    [showPackages],
  );
  const fromPrice = Math.min(
    ...healthPackages.map((p) => Number(p.price) || Infinity),
  );
  const quick = [
    ["calendar-2", "Book visit", "/doctors"],
    ["document-text", "My records", "/records"],
    ["bill", "My bills", "/billing"],
    ...(showPackages ? [["health", "Packages", "/packages"]] : []),
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
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            const main = panel.current.closest("main");
            main.scrollTo({
              top:
                main.scrollTop +
                panel.current.getBoundingClientRect().top -
                main.getBoundingClientRect().top -
                72,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? "instant"
                : "smooth",
            });
          }}
          onPointerDown={(event) => {
            dragged.current = false;
            drag.current = {
              y: event.clientY,
              scroll: panel.current.closest("main").scrollTop,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current) {
              if (Math.abs(drag.current.y - event.clientY) > 5)
                dragged.current = true;
              panel.current.closest("main").scrollTop =
                drag.current.scroll + drag.current.y - event.clientY;
            }
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
        <div
          className={s.quickActions}
          role="group"
          aria-label="Care shortcuts"
          style={{ "--quick-count": quick.length }}
        >
          {quick.map(([icon, label, path]) => (
            <button key={path} onClick={() => navigate(path)}>
              <span className={s.quickIcon}>
                <Icon name={icon} bulk size={26} />
              </span>
              <span>{label}</span>
            </button>
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
                  ? "Connected to this profile"
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
                  aria-label="Create ABHA (opens in a new tab)"
                  variant="outline"
                >
                  Create ABHA
                </Button>
              </>
            )}
          </div>
        </section>

        {past.length > 0 && (
          <>
            <SectionTitle
              className={s.sectionHeading}
              action="View all"
              onAction={() => navigate("/appointments?tab=past")}
            >
              Past consultations
            </SectionTitle>
            <div
              className={s.visitRail}
              aria-label="Past consultations"
              data-single={past.length === 1 || undefined}
            >
              {past.slice(0, 5).map((visit) => (
                <AppointmentCard
                  key={visit.id}
                  visit={visit}
                  className={s.visitCard}
                  onDetails={() => navigate(`/appointments?visit=${visit.id}`)}
                />
              ))}
            </div>
          </>
        )}

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
              title={record.title}
              subtitle={
                <span className={s.recordMeta}>
                  <Meta>
                    {formatDate(record.date)}
                    {record.category}
                  </Meta>
                  {record.new && (
                    <Badge variant="soft" color="primary" size="sm">
                      New
                    </Badge>
                  )}
                </span>
              }
              onClick={() => navigate(recordPath(record))}
            />
          ))}
        </div>
        {healthPackages.length > 0 && (
          <section className={s.packagesBlock} aria-label="Health packages">
            <button
              type="button"
              className={s.packagePromo}
              onClick={() => navigate("/packages")}
            >
              <span className={s.promoText}>
                <span className={s.promoEyebrow}>
                  <Icon name="health" size={14} bulk /> Health check-ups
                </span>
                <strong>Book health packages &amp; vaccines</strong>
                <small>
                  {Number.isFinite(fromPrice)
                    ? `Check-ups from ${money(fromPrice)}. Pay at the hospital.`
                    : "Pay at the hospital."}
                </small>
                <span className={s.promoCta}>
                  Explore packages
                  <Icon name="chevron-right" size={16} />
                </span>
              </span>
              <span className={s.promoMedia} aria-hidden="true">
                {healthPackages[0].images?.[0] ? (
                  <ItemCover item={healthPackages[0]} kind="package" />
                ) : (
                  <span className={s.promoArt}>
                    <Icon name="health" size={120} bulk />
                  </span>
                )}
              </span>
            </button>
            <div className={s.pastRail} aria-label="Popular packages">
              {healthPackages.slice(0, 3).map((item) => (
                <PackageCard
                  key={item.id}
                  item={item}
                  kind="package"
                  className={packageStyles.railCard}
                  onOpen={() => navigate(`/packages/${item.id}`)}
                />
              ))}
            </div>
          </section>
        )}
        <SectionTitle
          className={s.sectionHeading}
          action="Manage"
          onAction={() => navigate("/family")}
        >
          Your family
        </SectionTitle>
        <div className={s.familyMini} role="group" aria-label="Family profiles">
          {state.members.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                dispatch({ type: "SELECT_MEMBER", id: m.id });
              }}
              data-active={m.id === activeMember.id}
              aria-pressed={m.id === activeMember.id}
              aria-label={`${m.name}, ${m.relation}${m.id === activeMember.id ? ", current profile" : ". Switch profile"}`}
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
          <button
            className={s.addFamily}
            aria-label="Add a family member"
            onClick={() => navigate("/family?add=1")}
          >
            <span className={s.addFamilyIcon} aria-hidden="true">
              <Icon name="add-plain" size={24} />
            </span>
            <strong>Add new</strong>
            <small>Family</small>
          </button>
        </div>
        <div className={s.homeFooter}>
          <BrandLogo />
          <p>Here for you. Every step of the way.</p>
        </div>
      </div>
    </div>
  );
}
