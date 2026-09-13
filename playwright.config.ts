import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  webServer: process.env["PLAYWRIGHT_REUSE_RUNNING_SERVER"]
    ? undefined
    : {
        command: "node node_modules/vite/bin/vite.js dev --host 127.0.0.1",
        url: "http://127.0.0.1:3000/login",
        reuseExistingServer: true,
      },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"] } },
    { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
  ],
});
