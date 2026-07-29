import { expect, test } from "@playwright/test";

const email = process.env.CUBIQLO_E2E_EMAIL;
const password = process.env.CUBIQLO_E2E_PASSWORD;
const baseUrl = process.env.BASE_URL ?? "";
const safeTarget = /^https?:\/\/(?:127\.0\.0\.1|localhost|dev\.cubiqlo\.com)(?::\d+)?(?:\/|$)/.test(baseUrl);
const enabled = process.env.ALLOW_MUTATING_E2E === "true" && safeTarget && Boolean(email && password);

test.describe("Waktu timer UX", () => {
  test.skip(!enabled, "Requires explicit E2E opt-in, QA credentials, and localhost/dev target");

  test("opens task-first timer dialog", async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(`${page.url()}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`${page.url()}: ${message.text()}`);
    });

    const basicAuth = Buffer.from("alip:dev2026").toString("base64");
    await page.setExtraHTTPHeaders({ Authorization: `Basic ${basicAuth}` });
    const login = await page.request.post("/api/auth/sign-in/email", {
      headers: { Authorization: `Basic ${basicAuth}` },
      data: { email, password },
    });
    expect(login.status()).toBe(200);

    await page.goto("/app/time", { waitUntil: "networkidle" });
    await page.getByTestId("start-timer-trigger").click();

    await expect(page.getByRole("dialog", { name: "Mulai Timer" })).toBeVisible();
    await expect(page.getByText("Pilih project dan task dulu supaya waktu langsung masuk ke pekerjaan yang bisa ditinjau dan ditagihkan.")).toBeVisible();
    await expect(page.getByText("Mulai timer untuk task ini")).toBeDisabled();
    await expect(page.getByTestId("start-timer-project")).toBeVisible();
    await expect(page.getByTestId("start-timer-task")).toBeVisible();

    expect(browserErrors).toEqual([]);
  });
});
