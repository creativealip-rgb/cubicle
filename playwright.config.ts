import { defineConfig, devices } from "@playwright/test"

const httpUser = process.env.PLAYWRIGHT_HTTP_USER
const httpPassword = process.env.PLAYWRIGHT_HTTP_PASSWORD

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "https://cubiqlo.com",
    ...(httpUser && httpPassword
      ? { httpCredentials: { username: httpUser, password: httpPassword } }
      : {}),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    },
  ],
})
