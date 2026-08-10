import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD are required");
test.use({ storageState: ".auth/user.json" });

test("production client portal set password unlock and slug", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const clientName = `QA Portal Client ${stamp}`;
  const portalPassword = "PortalQA2026!";

  await page.goto("/app/clients");
  await page.getByRole("button", { name: "Tambah Klien" }).click();
  const create = page.getByRole("dialog", { name: "Tambah Klien" });
  await create.getByRole("textbox", { name: "Nama *" }).fill(clientName);
  await create.getByRole("button", { name: "Buat Klien" }).click();
  await expect(page.getByRole("link", { name: clientName, exact: true })).toBeVisible();

  try {
    await page.getByRole("link", { name: clientName, exact: true }).click();
    await page.getByRole("tab", { name: /Portal/i }).click();
    await expect(page.getByLabel("Atur password")).toBeVisible();
    await page.getByLabel("Atur password").fill(portalPassword);
    await page.getByRole("button", { name: "Simpan & aktifkan" }).click();
    await page.waitForLoadState("networkidle");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("tab", { name: /Portal/i }).click();
    await expect(page.getByLabel("Buka portal klien")).toBeVisible({ timeout: 15000 });

    const portalLink = page.getByLabel("Buka portal klien");
    const href = await portalLink.getAttribute("href");
    expect(href).toMatch(/\/client-portal\/[^/?]+$/);
    await page.goto(href!);
    await expect(page.getByRole("heading", { name: "Portal Klien" })).toBeVisible();
    await page.getByPlaceholder("Password portal").fill(portalPassword);
    await page.getByRole("button", { name: "Buka portal" }).click();
    await expect(page.getByText(clientName, { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole("tab", { name: "File" }).click();
    await expect(page.getByRole("heading", { name: "File" })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({ name: "qa-portal.txt", mimeType: "text/plain", buffer: Buffer.from("portal file fixture") });
    await expect(page.getByText("qa-portal.txt", { exact: true })).toBeVisible({ timeout: 15000 });
  } finally {
    await page.goto("/app/clients");
    await page.getByRole("link", { name: clientName, exact: true }).click();
    await page.getByRole("button", { name: "Hapus Permanen" }).click();
    const confirm = page.getByRole("dialog");
    await confirm.getByRole("textbox", { name: "Ketik nama untuk konfirmasi" }).fill(clientName);
    await confirm.getByRole("button", { name: "Hapus Permanen" }).click();
  }
});
