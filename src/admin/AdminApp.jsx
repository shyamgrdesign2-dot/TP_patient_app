import { useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useApp } from "../patient/state/AppContext";
import { brandMarkSrc } from "../shared/brand";
import { Icon } from "../shared/ui";
import { Button } from "../patient/components/ui";
import { readAdminConfig, writeAdminConfig } from "../shared/hospitalConfig";
import PushNotifications from "./PushNotifications";
import PackagesConfig from "./PackagesConfig";
import AppConfig from "./AppConfig";
import DoctorsConfig from "./DoctorsConfig";
import Overview from "./Overview";
import s from "./Admin.module.css";

// Hospital admin portal (web, desktop layout). Separate from the patient app
// and its phone frame; in Tatva Practice it sits inside the admin-doctor
// console and is reachable only by admins and admin doctors.
const SESSION = "tatva-admin-session";
const NAV = [
  ["overview", "Overview", "category-2"],
  ["app", "App configuration", "mobile"],
  ["doctors", "Doctors & clinics", "profile-2user"],
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
          {brandMarkSrc(brand) ? <img src={brandMarkSrc(brand)} alt="" /> : <Icon name="hospital" family="building" bulk size={26} />}
        </span>
        <h1>{brand.hospitalName}</h1>
        <p>Patient app admin console</p>
        <div className={s.roleGroup} role="radiogroup" aria-label="Sign in as">
          {[
            ["admin", "Hospital admin", "All settings, branding and notifications"],
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
      <aside className={s.sidebar}>
        <div className={s.sideBrand}>
          <span className={s.brandMark} data-small>
            {brandMarkSrc(brand) ? <img src={brandMarkSrc(brand)} alt="" /> : <Icon name="hospital" family="building" bulk size={20} />}
          </span>
          <div>
            <strong>{brand.hospitalName}</strong>
            <small>Patient app console</small>
          </div>
        </div>
        <nav aria-label="Admin sections">
          {NAV.map(([key, label, icon]) => (
            <NavLink
              key={key}
              to={`/admin/${key}`}
              className={({ isActive }) =>
                `${s.navItem} ${isActive ? s.navActive : ""}`
              }
            >
              <Icon name={icon} size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={s.sideFoot}>
          <span className={s.rolePill}>
            {session.role === "doctor" ? "Admin doctor" : "Hospital admin"}
          </span>
          <a href="/" target="_blank" rel="noreferrer" className={s.footLink}>
            <Icon name="export" size={16} /> Open patient app
          </a>
          <button className={s.footLink} onClick={onSignOut}>
            <Icon name="logout" size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className={s.main}>
        {saved && (
          <div className={s.saved} role="status">
            <Icon name="tick-circle" size={18} bulk /> {saved}
          </div>
        )}
        <div className={s.content}>
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview config={config} />} />
          <Route
            path="app"
            element={<AppConfig config={config} setConfig={setConfig} flash={flash} />}
          />
          <Route path="theme" element={<Navigate to="/admin/app" replace />} />
          <Route
            path="doctors"
            element={<DoctorsConfig config={config} setConfig={setConfig} flash={flash} />}
          />
          <Route
            path="packages"
            element={<PackagesConfig config={config} setConfig={setConfig} flash={flash} />}
          />
          <Route
            path="notifications"
            element={<PushNotifications config={config} setConfig={setConfig} flash={flash} />}
          />
          <Route path="*" element={<Navigate to="/admin/overview" replace />} />
        </Routes>
        </div>
      </main>
    </div>
  );
}
