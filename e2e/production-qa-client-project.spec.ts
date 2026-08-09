import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD are required");

test.use({ storageState: ".auth/user.json" });

test.describe("Production QA: browser CRUD", () => {
  test("client create, reload, edit, reload, archive, delete", async ({ page }) => {
    const name = `QA-E2E Client ${Date.now()}`;
    const emailValue = `qa-e2e-${Date.now()}@example.com`;

    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill(email);
    await page.getByRole("textbox", { name: "Password" }).fill(password);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15000 });

    await page.goto("/app/clients");
    await page.getByRole("button", { name: "Tambah Klien" }).click();
    const create = page.getByRole("dialog", { name: "Tambah Klien" });
    await create.getByRole("textbox", { name: "Nama *" }).fill(name);
    await create.getByRole("textbox", { name: "Email" }).fill(emailValue);
    await create.getByRole("button", { name: "Buat Klien" }).click();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();

    await page.getByRole("link", { name, exact: true }).click();
    await page.getByRole("button", { name: "Ubah" }).first().click();
    const edit = page.getByRole("dialog");
    await edit.getByRole("textbox", { name: "Nama *" }).fill(`${name} Edited`);
    await edit.getByRole("button", { name: /Simpan|Perbarui|Update/i }).click();
    await expect(page.getByRole("heading", { name: `${name} Edited`, exact: true })).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByRole("heading", { name: `${name} Edited`, exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Hapus Permanen" }).click();
    const confirm = page.getByRole("dialog");
    await confirm.getByRole("textbox", { name: "Ketik nama untuk konfirmasi" }).fill(`${name} Edited`);
    await confirm.getByRole("button", { name: "Hapus Permanen" }).click();
    await expect(page).toHaveURL(/\/app\/clients$/, { timeout: 15000 });
    await expect(page.getByRole("link", { name: `${name} Edited`, exact: true })).toHaveCount(0);
  });
});
