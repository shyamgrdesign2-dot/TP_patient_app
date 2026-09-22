import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { patientPwa } from "./scripts/pwa-plugin.js";
export default defineConfig({
  plugins: [react(), patientPwa()],
  server: { strictPort: true },
  build: { target: "es2022" },
});
