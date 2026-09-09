import { expect, test } from "@playwright/test";


test.use({ storageState: ".auth/user.json" });

test.describe("Production QA: browser CRUD", () => {
  test("client create, reload, edit, reload, archive, delete", async ({ page }) => {
    const name = `QA-E2E Client ${Date.now()}`;
    const emailValue = `qa-e2e-${Date.now()}@example.com`;

    await page.goto("/app/clients");
    await page.getByRole("button", { name: /Tambah Klien|Add Client/i }).click();
    const create = page.getByRole("dialog", { name: /Tambah Klien|Add Client/i });
    await create.getByRole("textbox", { name: /Nama \*|Name \*/i }).fill(name);
    await create.getByRole("textbox", { name: /Email/i }).fill(emailValue);
    await create.getByRole("button", { name: /Buat Klien|Create Client/i }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Ubah|Edit details/i }).first().click();
    const edit = page.getByRole("dialog");
    await edit.getByRole("textbox", { name: /Nama \*|Name \*/i }).fill(`${name} Edited`);
    await edit.getByRole("button", { name: /Simpan Perubahan|Save Changes/i }).click();
    await expect(page.getByRole("heading", { name: `${name} Edited`, exact: true })).toBeVisible({ timeout: 15000 });

    await page.reload();
    await expect(page.getByRole("heading", { name: `${name} Edited`, exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Aksi klien|Client actions/i }).click();
    await page.getByRole("menuitem", { name: /^Hapus$|^Delete$/i }).click();
    const confirm = page.getByRole("dialog");
    await confirm.getByRole("textbox", { name: /Ketik nama untuk konfirmasi|Type name to confirm/i }).fill(`${name} Edited`);
    await confirm.getByRole("button", { name: /Hapus Permanen|Delete Permanently/i }).click();
    await expect(page).toHaveURL(/\/app\/clients$/, { timeout: 15000 });
    await expect(page.getByRole("link", { name: `${name} Edited`, exact: true })).toHaveCount(0);
  });
});
