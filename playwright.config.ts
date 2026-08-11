import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_BASE_PORT ?? "3001");
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 300_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    port,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      ...process.env,
      KAIROS_AUTH_REQUIRED: "false",
      KAIROS_API_KEY: "",
      KAIROS_ENABLE_LOCAL_FALLBACK: "true",
      NODE_ENV: "development",
    },
  },
});
