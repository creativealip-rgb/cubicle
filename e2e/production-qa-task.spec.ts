import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test.use({ storageState: ".auth/user.json" });

test("production task create reload edit reload archive", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const client = `QA-E2E Task Client ${stamp}`;
  const project = `QA-E2E Task Project ${stamp}`;
  const task = `QA-E2E Task ${stamp}`;
  const edited = `${task} Edited`;

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 20_000 });

  try {
    await page.goto("/app/clients");
    await page.getByRole("button", { name: "Tambah Klien" }).click();
    let dialog = page.getByRole("dialog", { name: "Tambah Klien" });
    await dialog.getByRole("textbox", { name: "Nama *" }).fill(client);
    await dialog.getByRole("button", { name: "Buat Klien" }).click();
    await expect(page.getByRole("link", { name: client, exact: true })).toBeVisible();

    await page.goto("/app/projects");
    await page.getByRole("button", { name: "Proyek Baru" }).click();
    dialog = page.getByRole("dialog", { name: "Proyek Baru" });
    await dialog.locator("input").first().fill(project);
    await dialog.getByRole("combobox").nth(0).click();
    await page.getByRole("option", { name: client, exact: true }).click();
    await dialog.getByRole("button", { name: "Simpan" }).click();
    await expect(page.getByRole("link", { name: project, exact: true })).toBeVisible();
    const projectHref = await page.getByRole("link", { name: project, exact: true }).getAttribute("href");

    await page.goto(projectHref!);
    await page.getByRole("button", { name: "Tambah Tugas" }).click();
    dialog = page.getByRole("dialog", { name: "Tambah Tugas" });
    await dialog.getByRole("textbox", { name: "Judul" }).fill(task);
    await dialog.getByRole("textbox", { name: "Deskripsi" }).fill("QA description");
    await dialog.getByRole("button", { name: "Buat Tugas" }).click();
    const taskLocator = page.locator("p:visible").filter({ hasText: task }).first();
    await expect(taskLocator).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.locator("p:visible").filter({ hasText: task }).first()).toBeVisible();

    await page.locator("p:visible").filter({ hasText: task }).first().click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Ubah tugas", { exact: true })).toBeVisible();
    await dialog.getByRole("textbox", { name: "Judul" }).fill(edited);
    await dialog.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(page.locator("p:visible").filter({ hasText: edited }).first()).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.locator("p:visible").filter({ hasText: edited }).first()).toBeVisible();

    await page.locator("p:visible").filter({ hasText: edited }).first().click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Hapus Permanen" }).click();
    const confirm = page.getByRole("dialog").last();
    await confirm.getByRole("textbox", { name: "Ketik nama untuk konfirmasi" }).fill(edited);
    await confirm.getByRole("button", { name: "Hapus Permanen" }).click();
    await expect(page.getByText(edited, { exact: true })).toHaveCount(0);
  } finally {
    await page.goto("/app/projects").catch(() => undefined);
  }
});
