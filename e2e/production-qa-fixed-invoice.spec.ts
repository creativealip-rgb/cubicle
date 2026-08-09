import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD are required");
test.use({ storageState: ".auth/user.json" });

test("production fixed-price invoice DP then remaining final", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const client = `QA Fixed Invoice Client ${stamp}`;
  const project = `QA Fixed Invoice Project ${stamp}`;

  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/\/app\/dashboard/);

  await page.goto("/app/clients");
  await page.getByRole("button", { name: "Tambah Klien" }).click();
  const clientDialog = page.getByRole("dialog", { name: "Tambah Klien" });
  await clientDialog.getByRole("textbox", { name: "Nama *" }).fill(client);
  await clientDialog.getByRole("button", { name: "Buat Klien" }).click();
  await expect(page.getByRole("link", { name: client, exact: true })).toBeVisible();

  await page.goto("/app/projects");
  await page.getByRole("button", { name: "Proyek Baru" }).click();
  const projectDialog = page.getByRole("dialog", { name: "Proyek Baru" });
  await projectDialog.locator("input").first().fill(project);
  const selects = projectDialog.getByRole("combobox");
  await selects.nth(0).click();
  await page.getByRole("option", { name: client, exact: true }).click();
  await selects.nth(1).click();
  await page.getByRole("option", { name: "Harga Tetap", exact: true }).click();
  await projectDialog.getByRole("spinbutton").last().fill("1000000");
  await projectDialog.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("link", { name: project, exact: true }).first()).toBeVisible();

  try {
    await page.goto("/app/invoices/new");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: client, exact: true }).click();
    await page.getByText(project, { exact: true }).click();
    const projectCard = page.getByText(project, { exact: true }).locator("xpath=../..");
    const source = projectCard.getByRole("combobox").first();
    await source.click();
    await page.getByRole("option", { name: "DP", exact: true }).click();
    await projectCard.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: "Nominal", exact: true }).click();
    await projectCard.getByRole("spinbutton").fill("400000");
    await page.getByRole("button", { name: "Buat Invoice" }).click();
    await page.waitForURL(/\/app\/invoices\/[0-9a-f-]{36}/, { timeout: 20000 });
    await expect(page.getByText(/Rp\s*400\.000/).first()).toBeVisible();
    const dpUrl = page.url();

    await page.goto("/app/invoices/new");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: client, exact: true }).click();
    await page.getByText(project, { exact: true }).click();
    const projectCard2 = page.getByText(project, { exact: true }).locator("xpath=../..");
    const source2 = projectCard2.getByRole("combobox").first();
    await source2.click();
    await page.getByRole("option", { name: "Pelunasan sisa", exact: true }).click();
    await page.getByRole("button", { name: "Buat Invoice" }).click();
    await page.waitForURL(/\/app\/invoices\/[0-9a-f-]{36}/, { timeout: 20000 });
    await expect(page.getByText(/Rp\s*600\.000/).first()).toBeVisible();
    expect(page.url()).not.toBe(dpUrl);
  } finally {
    await page.goto("/app/projects");
    await page.getByRole("link", { name: project, exact: true }).first().click();
    await page.getByRole("button", { name: "Hapus Permanen" }).click();
    const confirm = page.getByRole("dialog");
    await confirm.getByRole("textbox", { name: "Ketik nama untuk konfirmasi" }).fill(project);
    await confirm.getByRole("button", { name: "Hapus Permanen" }).click();
    await page.goto("/app/clients");
    await page.getByRole("link", { name: client, exact: true }).first().click();
    await page.getByRole("button", { name: "Hapus Permanen" }).click();
    const clientConfirm = page.getByRole("dialog");
    await clientConfirm.getByRole("textbox", { name: "Ketik nama untuk konfirmasi" }).fill(client);
    await clientConfirm.getByRole("button", { name: "Hapus Permanen" }).click();
  }
});