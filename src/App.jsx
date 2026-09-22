import { useMemo, Component } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import {
  TesseractThemeProvider,
  createTheme,
} from "@dhspl-tatvacare/tesseract-ui";
import { AppProvider, useApp } from "./state/AppContext";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import { Doctors, Booking, Appointments, Queue } from "./pages/Appointments";
import Records from "./pages/Records";
import Family, { Profile } from "./pages/Family";
import {
  Billing,
  Packages,
  Vaccines,
  HomeCare,
  Hospital,
  Inpatient,
} from "./pages/Services";
import {
  More,
  Notifications,
  Settings,
  Branding,
  Emergency,
  Abha,
  Feedback,
} from "./pages/Account";
import { Welcome, Login } from "./pages/Auth";
import Assistant from "./pages/Assistant";
import { Empty, PageHeader } from "./components/ui";
import s from "./App.module.css";
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div style={{ padding: 32, fontFamily: "system-ui" }}>
        <h1>Something didn’t load.</h1>
        <p>Your demo data is still in this browser. Reload to try again.</p>
        <button onClick={() => window.location.reload()}>Reload app</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Protected() {
  const { session } = useApp();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
function ThemedApp() {
  const { brand } = useApp();
  const theme = useMemo(
    () =>
      createTheme({
        brand: brand.primary,
        accent: brand.accent,
        fontBody: brand.fontBody,
        fontHeading: brand.fontHeading,
        radius: 12,
      }),
    [brand],
  );
  if (
    import.meta.env.VITE_PATIENT_MODE &&
    import.meta.env.VITE_PATIENT_MODE !== "demo"
  )
    return (
      <div className={s.modeBlocked}>
        <h1>Patient service not configured</h1>
        <p>
          This release provides a demo only. A verified patient API and
          production authentication must be connected before live use.
        </p>
      </div>
    );
  return (
    <TesseractThemeProvider
      theme={theme}
      vars={{
        "--tesseract-font-body": brand.fontBody,
        "--tesseract-font-heading": brand.fontHeading,
        "--font-sans": brand.fontBody,
        "--font-heading": brand.fontHeading,
      }}
      colorScheme="light"
      rootTheme
    >
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route element={<Protected />}>
              <Route index element={<Home />} />
              <Route path="doctors" element={<Doctors />} />
              <Route path="book/:doctorId" element={<Booking />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="queue" element={<Queue />} />
              <Route path="records" element={<Records />} />
              <Route path="family" element={<Family />} />
              <Route path="profile" element={<Profile />} />
              <Route path="billing" element={<Billing />} />
              <Route path="packages" element={<Packages />} />
              <Route path="vaccines" element={<Vaccines />} />
              <Route path="home-care" element={<HomeCare />} />
              <Route path="hospital" element={<Hospital />} />
              <Route path="inpatient" element={<Inpatient />} />
              <Route path="more" element={<More />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="settings" element={<Settings />} />
              <Route path="branding" element={<Branding />} />
              <Route path="emergency" element={<Emergency />} />
              <Route path="abha" element={<Abha />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="assistant" element={<Assistant />} />
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
      </BrowserRouter>
    </TesseractThemeProvider>
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
