import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/mulish/latin-500.css";
import "@fontsource/mulish/latin-600.css";
import "@fontsource/mulish/latin-700.css";
import "@fontsource/mulish/latin-800.css";
import "@dhspl-tatvacare/tesseract-ui/styles.css";
import "./shared/global.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PatientApp from "./patient/App";
import AdminRoot from "./admin/AdminRoot";
// One build, two apps: /admin/* is the hospital console, everything else is
// the patient app. Each mounts its own providers; they share src/shared.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminRoot />} />
        <Route path="*" element={<PatientApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.warn("Offline support unavailable", error));
  });
}
