import { expect, test } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });

test("production client portal set password unlock and slug", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const clientName = `QA Portal Client ${stamp}`;
  const portalPassword = "PortalQA2026!";

  await page.goto("/app/clients");
  await page.getByRole("button", { name: /Tambah Klien|Add Client/i }).click();
  const create = page.getByRole("dialog", { name: /Tambah Klien|Add Client/i });
  await create.getByRole("textbox", { name: /Nama \*|Name \*/i }).fill(clientName);
  await create.getByRole("button", { name: /Buat Klien|Create Client/i }).click();
  await expect(page.getByRole("heading", { name: clientName, exact: true })).toBeVisible();

  try {
    await page.getByRole("button", { name: /Ubah detail|Edit details/i }).first().click();
    const edit = page.getByRole("dialog");
    await edit.getByLabel(/Password Portal|Portal Password/i).fill(portalPassword);
    await edit.getByRole("button", { name: /Simpan Perubahan|Save Changes/i }).click();
    await page.waitForLoadState("networkidle");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /Buka portal klien|Open Client Portal/i })).toBeVisible({ timeout: 15000 });

    const portalLink = page.getByRole("link", { name: /Buka portal klien|Open Client Portal/i });
    const href = await portalLink.getAttribute("href");
    expect(href).toMatch(/\/client-portal\/[^/?]+$/);
    await page.goto(href!);
    await expect(page.getByRole("heading", { name: /Portal Klien|Client Portal/i })).toBeVisible();
    await page.getByPlaceholder(/Password portal|Portal password/i).fill(portalPassword);
    await page.getByRole("button", { name: /Buka portal|Open portal/i }).click();
    await expect(page.getByText(clientName, { exact: true })).toBeVisible({ timeout: 15000 });
    await page.getByRole("tab", { name: /File|Files/i }).click();
    await expect(page.getByRole("heading", { name: /File|Files/i })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({ name: "qa-portal.txt", mimeType: "text/plain", buffer: Buffer.from("portal file fixture") });
    await expect(page.getByText("qa-portal.txt", { exact: true })).toBeVisible({ timeout: 15000 });
  } finally {
    await page.goto("/app/clients");
    await page.getByRole("link", { name: clientName, exact: true }).click();
    await page.locator('button[aria-label="Client actions"]:visible, button[aria-label="Aksi klien"]:visible').first().click();
    const archiveItem = page.getByRole("menuitem", { name: /Arsipkan|Archive/i });
    if (await archiveItem.isVisible()) {
      await archiveItem.click();
      const confirm = page.getByRole("dialog", { name: /Arsipkan klien|Archive client/i });
      if (await confirm.isVisible()) await confirm.getByRole("button", { name: /Arsipkan|Archive/i }).click();
    }
  }
});
