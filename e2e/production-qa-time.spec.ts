import { expect, test } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });

test("production manual time create and persistence", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const client = `QA-E2E Time Client ${stamp}`;
  const project = `QA-E2E Time Project ${stamp}`;
  const task = `QA-E2E Time Task ${stamp}`;

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
    await page.goto(await projectLink.getAttribute("href")!);

    await page.getByRole("button", { name: "Tambah Tugas" }).click();
    dialog = page.getByRole("dialog", { name: "Tambah Tugas" });
    await dialog.getByRole("textbox", { name: "Judul" }).fill(task);
    await dialog.getByRole("button", { name: "Buat Tugas" }).click();
    await expect(page.locator("p:visible").filter({ hasText: task }).first()).toBeVisible();

    await page.goto("/app/time");
    await page.getByRole("button", { name: "Catat Waktu" }).click();
    dialog = page.getByRole("dialog", { name: "Catat Waktu" });
    await dialog.getByRole("textbox", { name: "Cari klien atau proyek..." }).fill(project);
    await expect(page.getByText(project, { exact: true }).last()).toBeVisible();
    await page.getByText(project, { exact: true }).last().click();
    await dialog.getByPlaceholder("Cari tugas...").click();
    await dialog.getByPlaceholder("Cari tugas...").fill(task);
    await page.getByText(task, { exact: true }).last().click();
    await dialog.getByRole("spinbutton", { name: "Durasi (menit)" }).fill("60");
    await dialog.getByRole("textbox", { name: "Deskripsi" }).fill("QA manual time");
    const workDate = await dialog.locator('input[type="date"]').inputValue();
    await dialog.getByRole("button", { name: "Simpan" }).click();
    // Manual entries are duration-only with explicit workDate; weekly grid renders
    // project/task + duration cells but NOT the description. Daily view renders
    // the description. Navigate with explicit date=workDate because the server
    // (UTC) computes "today" (2026-08-09) one day behind the client (+08:00,
    // 2026-08-10) — a date-less navigation lands on an empty day.
    await page.goto(`/app/time?view=daily&date=${workDate}`);
    await expect(page.getByText("QA manual time", { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByText("QA manual time", { exact: true }).first()).toBeVisible();
  } finally {
    await page.goto("/app/time").catch(() => undefined);
  }
});
