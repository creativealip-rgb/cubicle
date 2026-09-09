import { expect, test } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });

const fileName = `QA-E2E-global-file-${Date.now()}.txt`;

test("global file upload reload download delete", async ({ page }) => {
  await page.goto("/app/files");
  await expect(page.getByRole("heading", { name: /Berkas|Files/i }).first()).toBeVisible();

  await page.getByRole("button", { name: /Unggah Berkas|Upload File/i }).click();
  await expect(page.getByRole("dialog", { name: /Unggah berkas|Upload file/i })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from("Cubiqlo production file QA"),
  });
  await expect(page.getByText(/File diunggah|File uploaded/i)).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await page.getByRole("textbox", { name: /Cari berkas|Search files/i }).fill(fileName);
  const fileNameNode = page.getByText(fileName, { exact: true }).last();
  await expect(fileNameNode).toBeVisible();
  const card = fileNameNode.locator("xpath=ancestor::div[contains(@class,'group')][1]");
  const [download] = await Promise.all([
    page.waitForEvent("popup"),
    card.getByTitle(/Buka \/ Download|Open \/ Download/i).click(),
  ]);
  await download.waitForLoadState("domcontentloaded").catch(() => {});
  expect(download.url()).toMatch(/\/api\/files\/[^/]+\/download/);
  await download.close();

  await card.getByRole("button", { name: new RegExp(`Hapus ${fileName}|Delete ${fileName}`, "i") }).click();
  const confirm = page.getByRole("dialog", { name: /Hapus berkas|Delete file/i });
  await confirm.getByRole("button", { name: /^Hapus$|^Delete$/i }).click();
  await expect(page.getByText(fileName, { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(fileName, { exact: true })).toHaveCount(0);
});
