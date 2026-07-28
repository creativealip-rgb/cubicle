import { expect, test } from "@playwright/test";

const email = process.env.PERSONAL_SITE_E2E_EMAIL;
const password = process.env.PERSONAL_SITE_E2E_PASSWORD;
const baseUrl = process.env.BASE_URL ?? "";
const safeMutatingTarget = /^https?:\/\/(?:127\.0\.0\.1|localhost|dev\.cubiqlo\.com)(?::\d+)?(?:\/|$)/.test(baseUrl);
const enabled = process.env.ALLOW_MUTATING_E2E === "true" && safeMutatingTarget && Boolean(email && password);

test.describe("Personal landing page V2", () => {
  test.skip(!enabled, "Requires explicit mutating-E2E opt-in, owner QA credentials, and localhost/dev target");

  test("draft, preview, publish, reopen, responsive public page, and unpublish", async ({ page, request }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(`${page.url()}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`${page.url()}: ${message.text()}`);
    });

    const login = await page.request.post("/api/auth/sign-in/email", {
      data: { email, password },
    });
    expect(login.status()).toBe(200);

    await page.goto("/app/personal-site", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Landing Page Personal" })).toBeVisible();

    const slug = `landing-v2-e2e-${Date.now().toString(36)}`;
    await page.getByRole("button", { name: "Agency", exact: true }).click();
    await page.getByLabel("Nama / studio").fill("Northstar E2E Studio");
    await page.getByLabel("Tujuan publik").fill("mailto:e2e@example.com");
    await page.getByLabel("Slug publik").fill(slug);
    await page.getByLabel("Slug publik").blur();
    await expect(page.getByText("Slug tersedia.")).toBeVisible();

    await page.getByRole("button", { name: "Tambah", exact: true }).click();
    await page.getByLabel("Label tautan").fill("Portfolio E2E");
    await page.getByLabel("URL tautan").fill("https://example.com/portfolio");

    const payload = JSON.parse(await page.locator('form input[name="site"]').first().inputValue());
    const preview = page.getByRole("region", { name: "Preview landing page" });
    await expect(preview).toContainText("Northstar E2E Studio");
    expect(payload.title).toBe("Northstar E2E Studio");
    expect(payload.ctaUrl).toBe("mailto:e2e@example.com");
    expect(payload.links).toHaveLength(1);

    await page.getByRole("button", { name: "Simpan draft" }).click();
    await expect(page.getByText("Draft landing page berhasil disimpan.")).toBeVisible();
    expect((await request.get(`/site/${slug}`)).status()).toBe(404);
    expect((await page.request.get("/site/preview")).status()).toBe(200);

    await page.getByRole("button", { name: "Publish perubahan" }).click();
    await expect(page.getByText("Landing page berhasil dipublikasikan.")).toBeVisible();
    expect((await request.get(`/site/${slug}`)).status()).toBe(200);

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByLabel("Nama / studio")).toHaveValue("Northstar E2E Studio");
    await expect(page.getByLabel("Slug publik")).toHaveValue(slug);
    await expect(page.getByText(/Status tersimpan:/).locator("..")).toContainText("Published");

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/site/${slug}`, { waitUntil: "networkidle" });
    const publicGeometry = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(publicGeometry.scrollWidth).toBe(publicGeometry.viewport);
    await expect(page.getByRole("link", { name: "Mulai proyek" })).toHaveAttribute("href", "mailto:e2e@example.com");
    await expect(page.getByRole("link", { name: "Portfolio E2E" })).toHaveAttribute("href", "https://example.com/portfolio");

    await page.goto("/app/personal-site", { waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "Preview" }).click();
    await expect(page.getByRole("region", { name: "Preview landing page" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mobile" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeHidden();

    await page.getByRole("tab", { name: "Edit" }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Unpublish" }).first().click();
    await expect(page.getByText("Draft landing page berhasil disimpan.")).toBeVisible();
    expect((await request.get(`/site/${slug}`)).status()).toBe(404);

    expect(browserErrors).toEqual([]);
  });
});
