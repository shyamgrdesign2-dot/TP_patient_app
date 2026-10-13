import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { patientPwa } from "./scripts/pwa-plugin.js";
import { brandWebsiteImport } from "./scripts/brand-import-plugin.js";
export default defineConfig({
  plugins: [react(), patientPwa(), brandWebsiteImport()],
  server: { strictPort: true },
  build: { target: "es2022" },
});
