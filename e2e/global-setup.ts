import { chromium, type FullConfig } from "@playwright/test";
import * as fs from "node:fs";

const authFile = ".auth/user.json";
const freshMs = 6 * 24 * 60 * 60 * 1000;

export default async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) return;
  if (fs.existsSync(authFile) && Date.now() - fs.statSync(authFile).mtimeMs < freshMs) return;

  fs.mkdirSync(".auth", { recursive: true });
  const baseURL = config.projects[0].use.baseURL;
  if (!baseURL) throw new Error("BASE_URL is required for E2E auth setup");
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const context = await browser.newContext({ baseURL });
  const response = await context.request.post("/api/auth/sign-in/email", {
    data: { email, password },
    headers: { Origin: baseURL },
  });
  if (!response.ok()) throw new Error(`E2E sign-in failed: ${response.status()}`);
  await context.storageState({ path: authFile });
  await browser.close();
}