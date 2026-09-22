import { useEffect, useRef } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { Button, Icon, BrandLogo } from "./ui";
import { brandPresets } from "../config/brand";
import s from "../App.module.css";
import AgentNavigation from "./AgentNavigation";
const tabs = [
  { path: "/", label: "Home", icon: "home-2" },
  { path: "/appointments", label: "Calendar", icon: "calendar-2" },
  { path: "/records", label: "Records", icon: "document-text" },
  { path: "/more", label: "More", icon: "category" },
];
export default function Shell() {
  const { brand, setBrand, toast, session } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const scroll = useRef(null);
  const dock = useRef(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [location.pathname]);
  const parentTab = ["/doctors", "/queue", "/assistant"].includes(
    location.pathname,
  )
    ? "/appointments"
    : ["/link-records", "/abha"].includes(location.pathname)
      ? "/records"
      : ["/profile", "/family"].includes(location.pathname)
        ? "/more"
        : null;
  const active =
    parentTab ||
    tabs.find((t) => t.path !== "/" && location.pathname.startsWith(t.path))
      ?.path ||
    (location.pathname === "/" ? "/" : "/more");
  const showNav =
    session &&
    !["/welcome", "/login", "/onboarding", "/assistant"].includes(
      location.pathname,
    ) &&
    !location.pathname.startsWith("/book");
  useEffect(() => {
    const node = dock.current;
    if (!node) return;
    const update = () =>
      node.parentElement.style.setProperty(
        "--patient-dock-space",
        `${node.getBoundingClientRect().height}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, [showNav]);
  return (
    <div className={s.previewStage}>
      <aside className={s.previewIntro}>
        <BrandLogo />
        <span className={s.eyebrow}>THE PATIENT EXPERIENCE</span>
        <h1>
          Care that
          <br />
          stays with you<span>.</span>
        </h1>
        <p>
          Your hospital. Your family.
          <br />
          Your health, beautifully connected.
        </p>
        <div className={s.previewFeatures}>
          <span>
            <Icon name="calendar-tick" /> Your next visit, made simple
          </span>
          <span>
            <Icon name="document-text" /> Every record, in one place
          </span>
          <span>
            <Icon name="people" /> Your whole family, together
          </span>
        </div>
        <div className={s.previewBrand}>
          <small>MAKE IT YOUR HOSPITAL</small>
          <div className={s.swatches}>
            {brandPresets.map((p) => (
              <button
                key={p.name}
                style={{ background: p.primary }}
                aria-label={`Preview ${p.name}`}
                aria-pressed={brand.name === p.name}
                onClick={() => setBrand(p)}
              />
            ))}
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate("/branding")}
            >
              Customise <Icon name="chevron-right" size={16} />
            </Button>
          </div>
          <span>One configuration. Your brand, everywhere.</span>
        </div>
        <div className={s.previewNote}>
          <span className={s.liveDot} /> Interactive preview · Sample patient
          data
        </div>
      </aside>
      <div className={s.phone}>
        <div className={s.appViewport} data-has-nav={showNav}>
          <main className={s.scrollArea} ref={scroll} id="app-content">
            <Outlet />
          </main>
          <div ref={dock} className={s.careDock}>
            <div id="page-action" className={s.floatingActionSlot} />
          </div>
          <AgentNavigation />
          {showNav && (
            <nav className={s.navbar} aria-label="Main navigation">
              {tabs.map((tab) => (
                <Button
                  asChild
                  key={tab.path}
                  className={s.navItem}
                  variant="ghost"
                  aria-label={tab.label}
                  aria-current={active === tab.path ? "page" : undefined}
                  data-active={active === tab.path}
                  onClick={() => navigate(tab.path)}
                >
                  <button type="button">
                    <span className={s.navIcon}>
                      <Icon
                        name={tab.icon}
                        size={22}
                        bulk={active === tab.path}
                      />
                    </span>
                    {active === tab.path && (
                      <span className={s.navLabel}>{tab.label}</span>
                    )}
                  </button>
                </Button>
              ))}
            </nav>
          )}
          {toast && (
            <div className={s.toast} role="status" data-error={toast.error}>
              <Icon name={toast.error ? "info-circle" : "tick-circle"} bulk />
              {toast.message}
            </div>
          )}
        </div>
      </div>
      <span className={s.previewFoot}>
        DESIGNED WITH TESSERACT <span>·</span> BUILT AROUND YOU
      </span>
    </div>
  );
}
