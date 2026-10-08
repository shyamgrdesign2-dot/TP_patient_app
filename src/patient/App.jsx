import AbhaFlow from "./pages/AbhaFlow";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import ErrorBoundary from "../shared/ErrorBoundary";
import BrandTheme from "../shared/BrandTheme";
import DemoOnly from "../shared/DemoOnly";
import { AppProvider, useApp } from "./state/AppContext";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import { Doctors, Booking, Appointments } from "./pages/Appointments";
import LinkRecords from "./pages/LinkRecords";
import Records from "./pages/Records";
import Family, { Profile } from "./pages/Family";
import {
  Billing,
  Hospital,
} from "./pages/Services";
import {
  More,
  Notifications,
  Settings,
  Emergency,
  Feedback,
} from "./pages/Account";
import { Welcome, Login } from "./pages/Auth";
import Assistant from "./pages/Assistant";
import Packages, { PackageDetail, PackageBookings } from "./pages/Packages";
import { Empty, PageHeader } from "./components/ui";
import s from "./App.module.css";
function Protected() {
  const { session } = useApp();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
// Patient routes. main.jsx mounts this for every path outside /admin.
function ThemedApp() {
  const { brand } = useApp();
  return (
    <DemoOnly>
      <BrandTheme brand={brand}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route element={<Protected />}>
              <Route index element={<Home />} />
              <Route path="doctors" element={<Doctors />} />
              <Route path="book/:doctorId" element={<Booking />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="records" element={<Records />} />
              <Route path="family" element={<Family />} />
              <Route path="profile" element={<Profile />} />
              <Route path="billing" element={<Billing />} />
              <Route path="hospital" element={<Hospital />} />
              <Route path="more" element={<More />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
              <Route path="emergency" element={<Emergency />} />
              <Route
                path="abha"
                element={<AbhaFlow />}
              />
              <Route path="link-records" element={<LinkRecords />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="packages" element={<Packages />} />
              <Route path="packages/bookings" element={<PackageBookings />} />
              <Route path="packages/:id" element={<PackageDetail />} />
            </Route>
            <Route
              path="*"
              element={
                <div className={s.page}>
                  <PageHeader title="Page not found" />
                  <Empty
                    title="Let’s get you back to your care"
                    description="Choose Home from the navigation below."
                  />
                </div>
              }
            />
          </Route>
        </Routes>
      </BrandTheme>
    </DemoOnly>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ThemedApp />
      </AppProvider>
    </ErrorBoundary>
  );
}
