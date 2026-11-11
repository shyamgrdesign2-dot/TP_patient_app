import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useApp } from "../patient/state/AppContext";
import { brandMarkSrc } from "../shared/brand";
import { Icon } from "../shared/ui";
import { readAdminConfig, writeAdminConfig } from "../shared/hospitalConfig";
import AppConfig from "./AppConfig";
import DoctorsConfig from "./DoctorsConfig";
import Feedback from "./Feedback";
import s from "./Admin.module.css";
import { Sidebar, Tabs, TabsList, TabsTrigger } from "@dhspl-tatvacare/tesseract-ui";

// Hospital admin portal (web, desktop layout). Separate from the patient app
// and its phone frame; in Tatva Practice it sits inside the admin-doctor
// console and is reachable only by admins and admin doctors.
const NAV = [
  ["overview", "Overview", "category-2"],
  ["app", "App configuration", "mobile", true],
  ["doctors", "Doctors & clinics", "profile-2user", true],
  ["feedback", "Patient feedback", "message-favorite", true],
  ["packages", "Packages & vaccines", "health"],
  ["notifications", "Messages", "message-text"],
];

// Matches the stylesheet's breakpoints so layout and markup switch together:
// ≤900px a top bar with tabs replaces the sidebar; ≤1100px the sidebar is a rail.
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function useAdminConfig() {
  const [config, setConfig] = useState(readAdminConfig);
  const update = (next) => {
    setConfig(next);
    writeAdminConfig(next);
  };
  return [config, update];
}

// This demo has one Hospital admin workspace. Production authentication stays
// behind DemoOnly until the verified service is connected.
export default function AdminApp() {
  return <AdminShell />;
}

function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useRef(null);
  // Tesseract 1.1 Sidebar has no disabled-item prop. Apply native disabled
  // semantics to its rendered leaf buttons, while guarding selection too.
  useLayoutEffect(() => {
    const items = sidebar.current?.querySelectorAll("nav button") || [];
    items.forEach((button, index) => {
      button.disabled = !NAV[index]?.[3];
      button.setAttribute("aria-disabled", String(button.disabled));
    });
  }, [location.pathname]);
  const { brand } = useApp();
  const compact = useMediaQuery("(max-width: 900px)");
  const rail = useMediaQuery("(max-width: 1100px)");
  const [config, setConfig] = useAdminConfig();
  const [saved, setSaved] = useState("");
  const flash = (msg) => {
    setSaved(msg);
    clearTimeout(flash.t);
    flash.t = setTimeout(() => setSaved(""), 2400);
  };
  const active = location.pathname.split("/")[2] || "app";
  const brandBlock = (
    <div className={s.sideBrand}>
      <span className={s.brandMark} data-small>
        {brandMarkSrc(brand) ? (
          <img src={brandMarkSrc(brand)} alt="" />
        ) : (
          <Icon name="hospital" family="building" bulk size={20} />
        )}
      </span>
      <div>
        <strong>{brand.hospitalName}</strong>
        <small>Patient app console</small>
      </div>
    </div>
  );
  const openApp = (
    <a href="/" target="_blank" rel="noreferrer" className={s.footLink}>
      <Icon name="export" size={16} /> Open patient app
    </a>
  );
  return (
    <div className={s.shell} data-compact={compact || undefined}>
      {compact ? (
        // Phones and portrait tablets: a top bar with the sections as tabs,
        // scrollable sideways, instead of a sidebar that would fill the screen.
        <header className={s.topBar}>
          <div className={s.topBarRow}>
            {brandBlock}
            {openApp}
          </div>
          <nav className={s.topNav} aria-label="Admin sections">
            <Tabs value={active} size="sm" onValueChange={(id) => navigate(`/admin/${id}`)}>
              <TabsList>
                {NAV.map(([id, label, icon, enabled]) => (
                  <TabsTrigger key={id} value={id} disabled={!enabled} leftIcon={<Icon name={icon} size={16} />}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </nav>
        </header>
      ) : (
        <Sidebar
          ref={sidebar}
          className={s.tesseractSidebar}
          expandedWidth={264}
          collapsedWidth={80}
          collapsed={rail}
          showCollapseToggle={false}
          bottomFade={false}
          aria-label="Admin sections"
          items={NAV.map(([id, label, icon]) => ({
            id,
            label,
            icon: <Icon name={icon} size={18} />,
          }))}
          activeId={active}
          onSelect={(id) => {
            if (NAV.find((item) => item[0] === id)?.[3]) navigate(`/admin/${id}`);
          }}
          logo={
            rail ? (
              <span className={s.brandMark} data-small title={brand.hospitalName}>
                {brandMarkSrc(brand) ? <img src={brandMarkSrc(brand)} alt="" /> : <Icon name="hospital" family="building" bulk size={20} />}
              </span>
            ) : (
              brandBlock
            )
          }
          footer={
            <div className={s.sideFoot}>
              {!rail && <span className={s.rolePill}>Hospital admin</span>}
              {rail ? (
                <a href="/" target="_blank" rel="noreferrer" className={s.footLink} aria-label="Open patient app" title="Open patient app">
                  <Icon name="export" size={16} />
                </a>
              ) : (
                openApp
              )}
            </div>
          }
        />
      )}
      <main className={s.main} aria-label="App administration">
        {saved && (
          <div className={s.saved} role="status">
            <Icon name="tick-circle" size={18} bulk /> {saved}
          </div>
        )}
        <div className={s.content}>
          <Routes>
            <Route index element={<Navigate to="app" replace />} />
            <Route
              path="app"
              element={
                <AppConfig
                  config={config}
                  setConfig={setConfig}
                  flash={flash}
                />
              }
            />
            <Route
              path="doctors"
              element={
                <DoctorsConfig
                  config={config}
                  setConfig={setConfig}
                  flash={flash}
                />
              }
            />
            <Route path="feedback" element={<Feedback />} />
            <Route path="*" element={<Navigate to="/admin/app" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
