import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:5179",
    viewport: { width: 390, height: 844 },
    browserName: "chromium",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  // Own server with the hosted collector off, so symptom tests use the local
  // demo flow and never reach UAT.
  webServer: {
    command:
      "VITE_SYMPTOM_COLLECTOR_URL=off npx vite --host 127.0.0.1 --port 5179 --strictPort",
    url: "http://127.0.0.1:5179",
    reuseExistingServer: false,
  },
});
