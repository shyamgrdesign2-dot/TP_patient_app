import { useEffect, useRef } from "react";
import { Logo, Toast } from "@dhspl-tatvacare/tesseract-ui";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { Button, Icon } from "./ui";
import Splash from "./Splash";
import { brandPresets } from "../../shared/brand";
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
  const parentTab = ["/doctors", "/assistant"].includes(location.pathname)
    ? "/appointments"
    : ["/link-records", "/abha"].includes(location.pathname)
      ? "/records"
      : ["/profile", "/family"].includes(location.pathname) ||
          location.pathname.startsWith("/packages")
        ? "/more"
        : null;
  const active =
    parentTab ||
    tabs.find((t) => t.path !== "/" && location.pathname.startsWith(t.path))
      ?.path ||
    (location.pathname === "/" ? "/" : "/more");
  const showNav =
    session &&
    ![
      "/welcome",
      "/login",
      "/onboarding",
      "/assistant",
      "/abha",
      "/link-records",
    ].includes(location.pathname) &&
    !location.pathname.startsWith("/packages") &&
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
        {/* The product pitch beside the phone stays Tatva Practice. */}
        <Logo variant="wordmark" height={24} tone="blue" />
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
              onClick={() => window.open("/admin/app#theme", "_blank", "noopener")}
            >
              Customise <Icon name="chevron-right" size={16} />
            </Button>
          </div>
          <span>One configuration. Your brand, everywhere.</span>
        </div>
        <div className={s.previewNote}>
          <span className={s.liveDot} /> Interactive preview
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
          <Splash />
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
            <div className={s.toastHost} role="status" key={toast.id}>
              <Toast
                status={toast.error ? "error" : "success"}
                title={toast.message}
                withSubtext={false}
                withCTA={false}
                maxWidth={400}
                className={s.toast}
              />
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
