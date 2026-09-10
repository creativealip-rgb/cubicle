import { expect, test } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });

test("production expense create edit reload delete", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const description = `QA expense ${stamp}`;
  const edited = `${description} edited`;

  await page.goto("/app/expenses");
  await expect(page.getByRole("heading", { name: /Pengeluaran|Expenses/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /Tambah Pengeluaran|Add Expense/i }).first().click();
  const dialog = page.getByRole("dialog", { name: /Tambah pengeluaran|Add expense/i });
  await dialog.getByLabel(/Tanggal|Date/i).fill(new Date().toISOString().slice(0, 10));
  await dialog.getByLabel(/Jumlah|Amount/i).fill("125000");
  await dialog.getByLabel(/Deskripsi|Description/i).fill(description);
  await dialog.locator('input[type="file"]').setInputFiles({ name: "qa-receipt.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
  await expect(page.getByText(/Struk diunggah|Receipt uploaded/i)).toBeVisible({ timeout: 15000 });
  await page.getByRole("dialog", { name: /Tambah pengeluaran|Add expense/i }).getByRole("button", { name: /Simpan|Save|Tambah|Add Expense/i }).click();
  await expect(page.getByText(description, { exact: true }).last()).toBeVisible({ timeout: 15000 });
  const createdRow = page.getByText(description, { exact: true }).locator("xpath=ancestor::tr");
  await createdRow.getByRole("button", { name: /Aksi pengeluaran|Expense actions/i }).click();
  await expect(page.getByRole("menuitem", { name: /Lihat struk|View receipt/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByText(description, { exact: true }).last()).toBeVisible();

  const row = page.getByText(description, { exact: true }).locator("xpath=ancestor::tr");
  await row.getByRole("button", { name: /Aksi pengeluaran|Expense actions/i }).click();
  await page.getByRole("menuitem", { name: /Ubah|Edit/i }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel(/Deskripsi|Description/i).fill(edited);
  await editDialog.getByRole("button", { name: /Simpan|Save|Ubah/i }).click();
  await expect(page.getByText(edited, { exact: true }).last()).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByText(edited, { exact: true }).last()).toBeVisible();

  const editedRow = page.getByText(edited, { exact: true }).locator("xpath=ancestor::tr");
  await editedRow.getByRole("button", { name: /Aksi pengeluaran|Expense actions/i }).click();
  await page.getByRole("menuitem", { name: /^Hapus$|^Delete$/i }).click();
  await page.getByRole("dialog", { name: /Hapus pengeluaran|Delete expense/i }).getByRole("button", { name: /^Hapus$|^Delete$/i }).click();
  await expect(page.getByText(edited, { exact: true })).toHaveCount(0);
});
