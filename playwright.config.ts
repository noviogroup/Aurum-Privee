import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const requestedTimeout = Number(process.env.PLAYWRIGHT_TEST_TIMEOUT_MS);
const testTimeout = Number.isFinite(requestedTimeout) && requestedTimeout >= 60_000
  ? requestedTimeout
  : 60_000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : externalBaseURL ? 1 : 0,
  workers: 1,
  timeout: testTimeout,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: externalBaseURL || "http://127.0.0.1:3040",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "wide-mobile-chromium",
      use: { ...devices["Pixel 5"], viewport: { width: 430, height: 932 } },
    },
    {
      name: "desktop-webkit",
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-webkit",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: externalBaseURL ? undefined : {
    command: "npm run start -- -H 127.0.0.1 -p 3040",
    url: "http://127.0.0.1:3040/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
