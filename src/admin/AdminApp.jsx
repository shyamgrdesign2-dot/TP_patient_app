import { useLayoutEffect, useRef, useState } from "react";
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
import { Button } from "../patient/components/ui";
import { readAdminConfig, writeAdminConfig } from "../shared/hospitalConfig";
import AppConfig from "./AppConfig";
import DoctorsConfig from "./DoctorsConfig";
import s from "./Admin.module.css";
import { Sidebar } from "@dhspl-tatvacare/tesseract-ui";

// Hospital admin portal (web, desktop layout). Separate from the patient app
// and its phone frame; in Tatva Practice it sits inside the admin-doctor
// console and is reachable only by admins and admin doctors.
const SESSION = "tatva-admin-session";
const NAV = [
  ["overview", "Overview", "category-2"],
  ["app", "App configuration", "mobile", true],
  ["doctors", "Doctors & clinics", "profile-2user", true],
  ["packages", "Packages & vaccines", "health"],
  ["notifications", "Messages", "message-text"],
];

function useAdminConfig() {
  const [config, setConfig] = useState(readAdminConfig);
  const update = (next) => {
    setConfig(next);
    writeAdminConfig(next);
  };
  return [config, update];
}

export default function AdminApp() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION) || "null");
    } catch {
      return null;
    }
  });
  if (!session)
    return (
      <AdminSignIn
        onSignIn={(next) => {
          sessionStorage.setItem(SESSION, JSON.stringify(next));
          setSession(next);
        }}
      />
    );
  return (
    <AdminShell
      session={session}
      onSignOut={() => {
        sessionStorage.removeItem(SESSION);
        setSession(null);
      }}
    />
  );
}

function AdminSignIn({ onSignIn }) {
  const { brand } = useApp();
  const [role, setRole] = useState("admin");
  return (
    <div className={s.signInPage}>
      <div className={s.signInCard}>
        <span className={s.brandMark}>
          {brandMarkSrc(brand) ? (
            <img src={brandMarkSrc(brand)} alt="" />
          ) : (
            <Icon name="hospital" family="building" bulk size={26} />
          )}
        </span>
        <h1>{brand.hospitalName}</h1>
        <p>Patient app admin console</p>
        <div className={s.roleGroup} role="radiogroup" aria-label="Sign in as">
          {[
            ["admin", "Hospital admin", "App configuration, clinics and fees"],
            ["doctor", "Admin doctor", "App configuration, clinics and fees"],
          ].map(([v, title, sub]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={role === v}
              className={s.roleCard}
              onClick={() => setRole(v)}
            >
              <span className={s.radio} aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
            </button>
          ))}
        </div>
        <Button fullWidth onClick={() => onSignIn({ role, at: Date.now() })}>
          Continue with Tatva Practice
        </Button>
        <small className={s.muted}>
          Only admins and admin doctors can open this console.
        </small>
      </div>
    </div>
  );
}

function AdminShell({ session, onSignOut }) {
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
  const [config, setConfig] = useAdminConfig();
  const [saved, setSaved] = useState("");
  const flash = (msg) => {
    setSaved(msg);
    clearTimeout(flash.t);
    flash.t = setTimeout(() => setSaved(""), 2400);
  };
  return (
    <div className={s.shell}>
      <Sidebar
        ref={sidebar}
        className={s.tesseractSidebar}
        expandedWidth={264}
        showCollapseToggle={false}
        bottomFade={false}
        aria-label="Admin sections"
        items={NAV.map(([id, label, icon]) => ({
          id,
          label,
          icon: <Icon name={icon} size={18} />,
        }))}
        activeId={location.pathname.split("/")[2] || "app"}
        onSelect={(id) => {
          if (NAV.find((item) => item[0] === id)?.[3]) navigate(`/admin/${id}`);
        }}
        logo={
          <>
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
          </>
        }
        footer={
          <>
            {" "}
            <div className={s.sideFoot}>
              <span className={s.rolePill}>
                {session.role === "doctor" ? "Admin doctor" : "Hospital admin"}
              </span>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className={s.footLink}
              >
                <Icon name="export" size={16} /> Open patient app
              </a>
              <button className={s.footLink} onClick={onSignOut}>
                <Icon name="logout" size={16} /> Sign out
              </button>
            </div>
          </>
        }
      />
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
            <Route path="*" element={<Navigate to="/admin/app" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
