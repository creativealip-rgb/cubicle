import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD are required");

test.use({ storageState: ".auth/user.json" });

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email!);
  await page.getByRole("textbox", { name: "Password" }).fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15000 });
}

async function createProject(page: import("@playwright/test").Page, name: string, model: "Hourly" | "Harga Tetap" | "Retainer", amount: string) {
  await page.goto("/app/projects");
  await page.getByRole("button", { name: "Proyek Baru" }).click();
  const dialog = page.getByRole("dialog", { name: "Proyek Baru" });
  await dialog.locator("input").first().fill(name);
  const selects = dialog.getByRole("combobox");
  await selects.nth(0).click();
  await page.getByRole("option").last().click();
  await selects.nth(1).click();
  await page.getByRole("option", { name: model === "Hourly" ? "Per Jam" : model, exact: true }).click();
  const numeric = dialog.getByRole("spinbutton");
  if (model === "Retainer") {
    await numeric.nth(0).fill(amount);
    await numeric.nth(1).fill("120");
    await numeric.nth(2).fill("1");
    const overage = dialog.getByRole("combobox").last();
    await overage.click();
    await page.getByRole("option", { name: /Bill|Tagih/i }).click();
    await dialog.getByRole("spinbutton").nth(3).fill("200000");
  } else {
    await numeric.last().fill(amount);
  }
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(page.getByRole("link", { name, exact: true }).first()).toBeVisible();
}

test("production project billing models create and persist", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const client = `QA-Coder Parent Client ${stamp}`;
  await login(page);
  await page.goto("/app/clients");
  await page.getByRole("button", { name: "Tambah Klien" }).click();
  const createDialog = page.getByRole("dialog", { name: "Tambah Klien" });
  await createDialog.getByRole("textbox", { name: "Nama *" }).fill(client);
  await createDialog.getByRole("button", { name: "Buat Klien" }).click();
  await expect(page.getByRole("link", { name: client, exact: true })).toBeVisible();

  const projects = [
    [`QA-E2E Hourly ${stamp}`, "Hourly" as const, "180000"],
    [`QA-E2E Fixed ${stamp}`, "Harga Tetap" as const, "2500000"],
    [`QA-E2E Retainer ${stamp}`, "Retainer" as const, "5000000"],
  ] as const;
  try {
    for (const [name, model, amount] of projects) await createProject(page, name, model, amount);
    for (const [name] of projects) {
      await page.getByRole("link", { name, exact: true }).first().click();
      await page.getByRole("button", { name: "Hapus Permanen" }).click();
      const confirm = page.getByRole("dialog");
      await confirm.getByRole("textbox", { name: "Ketik nama untuk konfirmasi" }).fill(name);
      await confirm.getByRole("button", { name: "Hapus Permanen" }).click();
      await page.goto("/app/projects");
    }
  } finally {
    await page.goto("/app/projects").catch(() => undefined);
  }
});
