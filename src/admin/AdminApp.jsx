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
import { readAdminConfig, writeAdminConfig } from "../shared/hospitalConfig";
import AppConfig from "./AppConfig";
import DoctorsConfig from "./DoctorsConfig";
import s from "./Admin.module.css";
import { Sidebar } from "@dhspl-tatvacare/tesseract-ui";

// Hospital admin portal (web, desktop layout). Separate from the patient app
// and its phone frame; in Tatva Practice it sits inside the admin-doctor
// console and is reachable only by admins and admin doctors.
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
              <span className={s.rolePill}>Hospital admin</span>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className={s.footLink}
              >
                <Icon name="export" size={16} /> Open patient app
              </a>
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
