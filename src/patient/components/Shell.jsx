import { useEffect, useRef } from "react";
import { Logo, Toast } from "@dhspl-tatvacare/tesseract-ui";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { Button, Icon } from "./ui";
import Splash from "./Splash";
import s from "../App.module.css";
import AgentNavigation from "./AgentNavigation";
const tabs = [
  { path: "/", label: "Home", icon: "home-2", inactiveIcon: "home-5" },
  { path: "/appointments", label: "Visits", icon: "calendar-2" },
  { path: "/records", label: "Records", icon: "document-text" },
  { path: "/more", label: "More", icon: "category" },
];
export default function Shell() {
  const { toast, session } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const scroll = useRef(null);
  const dock = useRef(null);
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
    if (previousPath.current !== location.pathname) {
      const destination = scroll.current?.querySelector("h1") || scroll.current;
      if (destination && !destination.hasAttribute("tabindex"))
        destination.tabIndex = -1;
      destination?.focus({ preventScroll: true });
      previousPath.current = location.pathname;
    }
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
    !location.pathname.startsWith("/records/") &&
    !location.pathname.startsWith("/book") &&
    !location.pathname.startsWith("/appointments/confirmed");
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
      <a className={s.skipLink} href="#app-content">
        Skip to patient content
      </a>
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
            <Button
              variant="outline"
              className={s.customiseButton}
              onClick={() =>
                window.open("/admin/app#hospital", "_blank", "noopener")
              }
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
          <main
            className={s.scrollArea}
            ref={scroll}
            id="app-content"
            tabIndex={-1}
          >
            <Outlet />
          </main>
          <div
            ref={dock}
            className={s.careDock}
            role="region"
            aria-label="Page actions"
          >
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
                        name={
                          active === tab.path
                            ? tab.icon
                            : tab.inactiveIcon || tab.icon
                        }
                        {...(tab.path === "/" && active !== "/"
                          ? { family: "home", corner: "rounded" }
                          : {})}
                        size={22}
                        bulk={active === tab.path}
                      />
                    </span>
                    <span className={s.navLabel}>{tab.label}</span>
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
