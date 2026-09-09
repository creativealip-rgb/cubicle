import { test, expect } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });

test("production task create reload edit reload archive", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const client = `QA-E2E Task Client ${stamp}`;
  const project = `QA-E2E Task Project ${stamp}`;
  const task = `QA-E2E Task ${stamp}`;
  const edited = `${task} Edited`;


  try {
    await page.goto("/app/clients");
    await page.getByRole("button", { name: /Tambah Klien|Add Client/i }).click();
    let dialog = page.getByRole("dialog", { name: /Tambah Klien|Add Client/i });
    await dialog.getByRole("textbox", { name: /Nama \*|Name \*/i }).fill(client);
    await dialog.getByRole("button", { name: /Buat Klien|Create Client/i }).click();
    await expect(page.getByRole("heading", { name: client, exact: true })).toBeVisible();

    await page.goto("/app/projects");
    await page.getByRole("button", { name: /Proyek Baru|New Project/i }).click();
    dialog = page.getByRole("dialog", { name: /Proyek Baru|New Project/i });
    await dialog.locator("input").first().fill(project);
    await dialog.getByRole("textbox", { name: /Cari klien|Search client/i }).fill(client);
    await page.getByText(client, { exact: true }).last().click();
    await dialog.getByRole("button", { name: /Buat Proyek|Create Project/i }).click();
    await expect(page.getByRole("heading", { name: project, exact: true })).toBeVisible();
    const projectHref = page.url();

    await page.goto(projectHref);
    await page.getByRole("tab", { name: /Tugas|Tasks/i }).click();
    await page.getByRole("button", { name: /Tambah Tugas|Add Task|New Task/i }).click();
    dialog = page.getByRole("dialog", { name: /Tambah Tugas|Add Task|New Task/i });
    await dialog.getByRole("textbox", { name: /Judul|Title/i }).fill(task);
    await dialog.getByRole("textbox", { name: /Deskripsi|Description/i }).fill("QA description");
    await dialog.getByRole("button", { name: /Buat Tugas|Create Task/i }).click();
    const taskLocator = page.locator("p:visible").filter({ hasText: task }).first();
    await expect(taskLocator).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(page.locator("p:visible").filter({ hasText: task }).first()).toBeVisible();

    await page.locator("p:visible").filter({ hasText: task }).first().click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Ubah tugas|Edit task/i)).toBeVisible();
    await dialog.getByRole("textbox", { name: /Judul|Title/i }).fill(edited);
    await dialog.getByRole("button", { name: /Simpan Perubahan|Save Changes/i }).click();
    await page.reload();
    await expect(page.locator("p:visible").filter({ hasText: edited }).first()).toBeVisible();

    await page.locator("p:visible").filter({ hasText: edited }).first().click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /Hapus Permanen|Delete Permanently/i }).click();
    const confirm = page.getByRole("dialog").last();
    await confirm.getByRole("textbox", { name: /Ketik nama untuk konfirmasi|Type name to confirm/i }).fill(edited);
    await confirm.getByRole("button", { name: /Hapus Permanen|Delete Permanently/i }).click();
    await expect(page.getByText(edited, { exact: true })).toHaveCount(0);
  } finally {
    await page.goto("/app/projects").catch(() => undefined);
  }
});
