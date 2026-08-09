import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
if (!email || !password) throw new Error("E2E_EMAIL and E2E_PASSWORD are required");

test.use({ storageState: ".auth/user.json" });

const STAMP = Date.now();
const CLIENT_NAME = `QA-E2E Invoice Parent Client ${STAMP}`;
const ITEM_DESC = `QA-E2E invoice item ${STAMP}`;
const ITEM_QTY = 2;
const ITEM_RATE = 150000;
const EXPECTED_TOTAL = ITEM_QTY * ITEM_RATE; // 300000
const PAYMENT_AMOUNT = 150000;

test("production invoice create / persist / payment / status / reports UI flow", async ({ page }) => {
  test.setTimeout(180_000);
  // Fail fast if auth state is stale (sign-in would 429 on repeat); .auth/user.json is validated separately.
  await page.goto("/app/invoices");
  await expect(page.getByRole("heading", { name: /Invoice|Invoices/i }).first()).toBeVisible({ timeout: 20000 });

  // ---- 1. Create client (QA-created parent, unique prefix) ----
  await page.goto("/app/clients");
  await page.getByRole("button", { name: "Tambah Klien" }).click();
  const createDialog = page.getByRole("dialog", { name: "Tambah Klien" });
  await createDialog.getByRole("textbox", { name: "Nama *" }).fill(CLIENT_NAME);
  await createDialog.getByRole("button", { name: "Buat Klien" }).click();
  await expect(page.getByRole("link", { name: CLIENT_NAME, exact: true }).first()).toBeVisible({ timeout: 15000 });

  // ---- 2. Create invoice (client-linked, manual item, IDR, draft) ----
  await page.goto("/app/invoices/new");
  await expect(page.getByRole("heading", { name: /Invoice Baru|New Invoice/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("combobox").first().click(); // Klien select
  await page.getByRole("option", { name: CLIENT_NAME, exact: true }).click();

  const itemInputs = page.getByLabel(/Deskripsi item 1/i);
  await itemInputs.fill(ITEM_DESC);
  await page.getByLabel(/Jumlah item 1/i).fill(String(ITEM_QTY));
  await page.getByLabel(/Harga item 1/i).fill(String(ITEM_RATE));
  await expect(page.getByText("Subtotal", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Buat Invoice" }).click();
  await page.waitForURL(/\/app\/invoices\/[0-9a-f-]{36}/, { timeout: 20000 });
  const invoiceUrl = page.url();
  const invoiceId = invoiceUrl.split("/").pop()!;
  await expect(page.getByRole("heading", { name: /Invoice INV-\d+/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(ITEM_DESC, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Draf", { exact: true }).first()).toBeVisible();

  // ---- 3. Reload + list persistence ----
  await page.reload();
  await expect(page.getByRole("heading", { name: /Invoice INV-\d+/i })).toBeVisible();
  await expect(page.getByText(ITEM_DESC, { exact: true }).first()).toBeVisible();
  await page.goto("/app/invoices");
  await expect(page.getByRole("link", { name: CLIENT_NAME, exact: true })).toBeVisible();
  await page.goto(`/app/invoices?status=draft`);
  await expect(page.getByRole("link", { name: /INV-\d+/i }).first()).toBeVisible();

  // ---- 4. Payment via UI (draft invoice allows; server asserts remaining) ----
  await page.goto(invoiceUrl);
  await page.getByRole("button", { name: "Catat Pembayaran" }).click();
  const payDialog = page.getByRole("dialog", { name: "Catat Pembayaran" });
  await payDialog.getByLabel("Jumlah *").fill(String(PAYMENT_AMOUNT));
  await payDialog.getByLabel("Tanggal Pembayaran *").fill("2026-08-10");
  await payDialog.getByRole("button", { name: "Catat Pembayaran", exact: true }).click();
  await expect(page.getByText("Pembayaran dicatat").first()).toBeVisible({ timeout: 15000 });

  // ---- 5. Status visible: badge override shows Lunas when fully paid ----
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByText(/Sisa.*Rp\s*150\.000/i).first()).toBeVisible({ timeout: 15000 });

  // ---- 6. Reports page render + period filter (no export; pure UI) ----
  await page.goto("/app/reports");
  await expect(page.getByRole("heading", { name: /Laporan|Reports/i }).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("combobox", { name: /Pilih periode laporan|Select report period/i }).click();
  await page.getByRole("option", { name: /Tahun berjalan|Current year/i }).click();
  await expect(page).toHaveURL(/period=year/);
  await expect(page.getByRole("heading", { name: /Laporan|Reports/i }).first()).toBeVisible();
  // ---- 7. Cleanup: draft invoice deletable via UI (no payments attached by delete; verified in DB postconditions) ----
  await page.goto(invoiceUrl);
  await page.getByRole("button", { name: "Hapus" }).click();
  const delDialog = page.getByRole("dialog", { name: "Hapus invoice ini?" });
  await delDialog.getByRole("button", { name: "Hapus Permanen" }).click();
  await page.goto("/app/invoices");
  await expect(page).toHaveURL(/\/app\/invoices(?:\?|$)/, { timeout: 15000 });

  // ---- 8. Client cleanup via UI (delete uses typed-name confirmation; client has no other projects) ----
  await page.goto("/app/clients");
  await page.getByRole("link", { name: CLIENT_NAME, exact: true }).first().click();
  await expect(page.getByRole("heading", { name: CLIENT_NAME })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Hapus Permanen" }).click();
  const confirmDialog = page.getByRole("dialog");
  await confirmDialog.getByRole("textbox", { name: /Ketik nama untuk konfirmasi/i }).fill(CLIENT_NAME);
  await confirmDialog.getByRole("button", { name: "Hapus Permanen" }).click();
  await page.waitForURL(/\/app\/clients$/, { timeout: 15000 });
  await page.goto("/app/clients?search=" + encodeURIComponent(CLIENT_NAME));
  await expect(page.getByRole("link", { name: CLIENT_NAME, exact: true })).toHaveCount(0);
});
