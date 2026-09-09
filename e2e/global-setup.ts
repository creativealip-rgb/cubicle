import { chromium, type FullConfig } from "@playwright/test";
import * as fs from "node:fs";

const authFile = ".auth/user.json";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  if (!baseURL) throw new Error("BASE_URL is required for E2E auth setup");

  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  try {
    if (fs.existsSync(authFile)) {
      const context = await browser.newContext({ baseURL, storageState: authFile });
      const page = await context.newPage();
      await page.goto("/app/dashboard", { waitUntil: "domcontentloaded" });
      const valid = new URL(page.url()).pathname.startsWith("/app/");
      await context.close();
      if (valid) return;
    }

    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    if (!email || !password) throw new Error("E2E auth state is invalid; E2E_EMAIL and E2E_PASSWORD are required to refresh it");

    fs.mkdirSync(".auth", { recursive: true });
    const context = await browser.newContext({ baseURL });
    const response = await context.request.post("/api/auth/sign-in/email", {
      data: { email, password },
      headers: { Origin: baseURL },
    });
    if (!response.ok()) throw new Error(`E2E sign-in failed: ${response.status()}`);
    await context.storageState({ path: authFile });
    await context.close();
  } finally {
    await browser.close();
  }
}
