import { expect, test } from "@playwright/test";

test.use({ storageState: ".auth/user.json" });
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const proposalTitle = `QA Proposal ${stamp}`;
const contractTitle = `QA Contract ${stamp}`;

test("proposal draft create reload delete", async ({ page }) => {
  await page.goto("/app/proposals/new");
  const dialog = page.getByRole("dialog", { name: /Proposal baru|New proposal/i });
  await dialog.getByLabel(/Nama client|Client name/i).fill(`QA Client ${stamp}`);
  await dialog.getByLabel(/Email client|Client email/i).fill(`qa-${stamp}@example.com`);
  await dialog.getByLabel(/Judul|Title/i).fill(proposalTitle);
  await dialog.locator("#desc-0").fill("Core QA service");
  await dialog.locator("#price-0").fill("250000");
  await dialog.getByRole("button", { name: /Buat draft|Create draft/i }).click();
  await expect(page).toHaveURL(/\/app\/proposals\/[^/]+\/edit/);
  await expect(page.getByText(/Changes saved|Perubahan tersimpan/i)).toBeVisible();
  const detailUrl = page.url().replace(/\/edit$/, "");
  await page.goto(detailUrl);
  await expect(page.getByRole("heading", { name: proposalTitle })).toBeVisible();
  await page.getByRole("button", { name: /^Hapus$|^Delete$/i }).click();
  await page.getByRole("group", { name: /Konfirmasi hapus proposal/i }).getByRole("button", { name: /^Hapus$/ }).click();
  await expect(page).toHaveURL(/\/app\/proposals$/);
  await expect(page.getByText(proposalTitle, { exact: true })).toHaveCount(0);
});

test("contract draft create reload delete", async ({ page }) => {
  await page.goto("/app/contracts/new");
  const dialog = page.getByRole("dialog", { name: /Kontrak baru|New contract/i });
  await dialog.getByText(/Nama client|Client name/i).locator("xpath=following::input[1]").fill(`QA Client ${stamp}`);
  await dialog.locator('input[type="email"]').fill(`qa-${stamp}@example.com`);
  await dialog.getByPlaceholder(/Perjanjian Kerja Sama|Service Agreement/i).fill(contractTitle);
  await dialog.getByRole("button", { name: /Buat draf|Create draft/i }).click();
  await expect(page).toHaveURL(/\/app\/contracts\/[^/]+\/edit/);
  await expect(page.getByText(/Changes saved|Perubahan tersimpan/i)).toBeVisible();
  const detailUrl = page.url().replace(/\/edit$/, "");
  await page.goto(detailUrl);
  await expect(page.getByRole("heading", { name: contractTitle })).toBeVisible();
  await page.getByRole("button", { name: /^Hapus$|^Delete$/i }).click();
  const confirm = page.getByRole("dialog", { name: /Hapus kontrak|Delete contract/i });
  await confirm.getByRole("button", { name: /^Hapus$|^Delete$/i }).click();
  await expect(page).toHaveURL(/\/app\/contracts$/);
  await expect(page.getByText(contractTitle, { exact: true })).toHaveCount(0);
});
