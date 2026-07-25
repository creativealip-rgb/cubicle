import { expect, test, type Page } from "@playwright/test";

const password = process.env.E2E_PASSWORD;
if (!password) throw new Error("E2E_PASSWORD is required");

async function login(page: Page, email: string) {
  const signIn = await page.request.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  expect(signIn.ok(), await signIn.text()).toBeTruthy();
}

async function postClient(page: Page, name: string, suffix: string) {
  return page.request.post("/api/clients/create", {
    form: { name, email: `created-${suffix}@cubiqlo.test` },
    maxRedirects: 0,
  });
}

test.describe("cross-tenant isolation", () => {
  test("workspace A owner cannot list or open workspace B resources", async ({ page }) => {
    await login(page, "owner-a@cubiqlo.test");
    await page.goto("/app/clients");
    await expect(page.getByText("E2E Client A", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("E2E Client B", { exact: true })).toHaveCount(0);

    const ids = JSON.parse(process.env.E2E_FIXTURE!);
    await page.goto(`/app/clients/${ids.clientB}`);
    await expect(page.getByText("E2E Client B", { exact: true })).toHaveCount(0);

    await page.goto("/app/projects");
    await expect(page.locator('a:visible', { hasText: "E2E Project A" }).first()).toBeVisible();
    await expect(page.getByText("E2E Project B", { exact: true })).toHaveCount(0);
    await page.goto(`/app/projects/${ids.projectB}`);
    await expect(page.getByText("E2E Project B", { exact: true })).toHaveCount(0);
  });

  test("owner and member can mutate own workspace", async ({ page }) => {
    for (const email of ["owner-a@cubiqlo.test", "member-a@cubiqlo.test"]) {
      await page.context().clearCookies();
      await login(page, email);
      const response = await postClient(page, `E2E Created ${email}`, email.startsWith("owner") ? "owner" : "member");
      expect([302, 303]).toContain(response.status());
    }
  });

  test("viewer cannot mutate and remains read-only", async ({ page }) => {
    await login(page, "viewer-a@cubiqlo.test");
    await page.goto("/app/clients");
    await expect(page.getByText("E2E Client A", { exact: true }).first()).toBeVisible();
    const response = await postClient(page, "E2E Viewer Forbidden", "viewer-forbidden");
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("outsider cannot see either workspace", async ({ page }) => {
    await login(page, "outsider@cubiqlo.test");
    await page.goto("/app/clients");
    await expect(page.getByText("E2E Client A", { exact: true }).first()).toHaveCount(0);
    await expect(page.getByText("E2E Client B", { exact: true })).toHaveCount(0);
  });
});
