import ErrorBoundary from "../shared/ErrorBoundary";
import BrandTheme from "../shared/BrandTheme";
import DemoOnly from "../shared/DemoOnly";
// Cross-dependency: the console reads and saves the brand, and reads demo
// bookings, through the patient app's provider (see src/admin/README.md).
import { AppProvider } from "../patient/state/AppContext";
import AdminApp from "./AdminApp";
import { defaultBrand } from "../shared/brand";

function ThemedAdmin() {
  return (
    <DemoOnly>
      <BrandTheme brand={defaultBrand}>
        <AdminApp />
      </BrandTheme>
    </DemoOnly>
  );
}
// Hospital admin console. main.jsx mounts this for /admin/*.
export default function AdminRoot() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <ThemedAdmin />
      </AppProvider>
    </ErrorBoundary>
  );
}
