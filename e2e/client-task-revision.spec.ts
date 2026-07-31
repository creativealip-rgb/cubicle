import { test, expect, type Page } from "@playwright/test";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;
let loginAttempt = 0;

async function login(page: Page) {
  loginAttempt += 1;
  const response = await page.request.post("/api/auth/sign-in/email", {
    headers: { "X-Forwarded-For": `10.99.0.${loginAttempt}` },
    data: { email, password },
  });
  expect(response.status(), await response.text()).toBe(200);
  await page.goto("/app/tasks", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Tugas", exact: true })).toBeVisible();
}

for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
  test.describe(viewport.name, () => {
    test.use({ viewport });
    test("Task navigation, pagination, and templates render without overflow/errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await login(page);
      await expect(page.getByRole("tab", { name: "Tugas Proyek" })).toHaveAttribute("aria-selected", "true");
      await page.getByRole("tab", { name: "Template Tugas" }).click();
      await expect(page.getByRole("button", { name: "Buat Template" })).toBeVisible();
      await expect(page.locator("body").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).resolves.toBe(true);
      expect(errors.filter(error => !error.includes("favicon"))).toEqual([]);
    });
  });
}

test("Client Project and Portal controls are reachable", async ({ page }) => {
  await login(page);
  await page.goto("/app/clients", { waitUntil: "networkidle" });
  const firstClient = page.locator('a[href^="/app/clients/"]').first();
  await expect(firstClient).toBeVisible();
  await firstClient.click();
  await page.getByRole("tab", { name: /Proyek/ }).click();
  await expect(page.getByRole("button", { name: "Tambah Proyek" })).toBeVisible();
  await page.getByRole("tab", { name: "Portal" }).click();
  await expect(page.getByLabel("Salin link portal")).toBeVisible();
  await expect(page.getByLabel("Buka portal klien")).toBeVisible();
});
