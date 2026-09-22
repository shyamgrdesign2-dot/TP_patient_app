import { useEffect, useRef } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { Button, Icon, BrandLogo } from "./ui";
import { brandPresets } from "../config/brand";
import s from "../App.module.css";
const tabs = [
  { path: "/", label: "Home", icon: "home-2" },
  { path: "/appointments", label: "Visits", icon: "calendar-2" },
  { path: "/records", label: "Records", icon: "document-text" },
  { path: "/family", label: "Family", icon: "people" },
  { path: "/more", label: "More", icon: "category" },
];
export default function Shell() {
  const { brand, setBrand, toast, session } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const scroll = useRef(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
  }, [location.pathname]);
  const parentTab = ["/doctors", "/queue", "/assistant"].includes(
    location.pathname,
  )
    ? "/appointments"
    : ["/link-records", "/abha"].includes(location.pathname)
      ? "/records"
      : location.pathname === "/profile"
        ? "/family"
        : null;
  const active =
    parentTab ||
    tabs.find((t) => t.path !== "/" && location.pathname.startsWith(t.path))
      ?.path ||
    (location.pathname === "/" ? "/" : "/more");
  const showNav =
    session &&
    !["/welcome", "/login", "/onboarding"].includes(location.pathname) &&
    !location.pathname.startsWith("/book");
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
        <div className={s.deviceStatus} aria-hidden="true">
          <span>9:41</span>
          <span className={s.dynamicIsland} />
          <div>
            <Icon name="wifi" size={16} />
            <Icon name="battery-full" size={20} />
          </div>
        </div>
        <div className={s.appViewport}>
          <main className={s.scrollArea} ref={scroll} id="app-content">
            <Outlet />
          </main>
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
        <div className={s.homeIndicator} aria-hidden="true" />
      </div>
      <span className={s.previewFoot}>
        DESIGNED WITH TESSERACT <span>·</span> BUILT AROUND YOU
      </span>
    </div>
  );
}
