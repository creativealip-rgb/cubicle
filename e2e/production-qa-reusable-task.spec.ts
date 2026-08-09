import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;

test.use({ storageState: ".auth/user.json" });

test("production reusable task create edit archive delete", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const client = `QA-E2E Reusable Client ${stamp}`;
  const project = `QA-E2E Reusable Project ${stamp}`;
  const task = `QA-E2E Reusable Task ${stamp}`;
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
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: "Per Jam", exact: true }).click();
    await dialog.getByRole("spinbutton").last().fill("180000");
    await dialog.getByRole("button", { name: "Simpan" }).click();
    const projectLink = page.getByRole("link", { name: project, exact: true });
    await expect(projectLink).toBeVisible();
    const projectHref = await projectLink.getAttribute("href");
    if (!projectHref) throw new Error("Project href missing");
    await page.goto(projectHref);

    const section = page.getByRole("heading", { name: "Tugas Berulang", exact: true }).locator(".." );
    await section.getByRole("button", { name: "Tambah Tugas" }).click();
    dialog = page.getByRole("dialog", { name: "Tambah Tugas" });
    await dialog.getByRole("textbox", { name: "Judul" }).fill(task);
    await dialog.getByRole("textbox", { name: "Deskripsi" }).fill("Reusable QA description");
    await dialog.getByRole("button", { name: "Buat Tugas" }).click();
    await expect(page.getByText(task, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await page.reload();
    const row = page.locator("p:visible").filter({ hasText: task }).first().locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Ubah" }).click();
    dialog = page.getByRole("dialog", { name: "Ubah Tugas Berulang" });
    await dialog.getByRole("textbox", { name: "Judul" }).fill(edited);
    await dialog.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(page.locator("p:visible").filter({ hasText: edited }).first()).toBeVisible({ timeout: 20_000 });
    await page.reload();
    const editedRow = page.locator("p:visible").filter({ hasText: edited }).first().locator("xpath=ancestor::div[contains(@class,'grid')][1]");
    await editedRow.getByRole("button", { name: "Arsipkan" }).click();
    await expect(editedRow).toContainText("Diarsipkan");
    await editedRow.getByRole("button", { name: "Hapus Permanen" }).click();
    const confirm = page.getByRole("dialog").last();
    await confirm.getByRole("textbox", { name: "Ketik nama untuk konfirmasi" }).fill(edited);
    await confirm.getByRole("button", { name: "Hapus Permanen" }).click();
    await expect(page.locator("p:visible").filter({ hasText: edited })).toHaveCount(0);
  } finally {
    await page.goto("/app/projects").catch(() => undefined);
  }
});
