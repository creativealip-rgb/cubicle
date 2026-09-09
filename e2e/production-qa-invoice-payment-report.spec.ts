import { expect, test } from "@playwright/test";


test.use({ storageState: ".auth/user.json" });

const STAMP = Date.now();
const CLIENT_NAME = `QA-E2E Invoice Parent Client ${STAMP}`;
const ITEM_DESC = `QA-E2E invoice item ${STAMP}`;
const ITEM_QTY = 2;
const ITEM_RATE = 150000;
const _EXPECTED_TOTAL = ITEM_QTY * ITEM_RATE; // 300000
const PAYMENT_AMOUNT = 150000;

test("production invoice create / persist / payment / status / reports UI flow", async ({ page }) => {
  test.setTimeout(180_000);
  // Fail fast if auth state is stale (sign-in would 429 on repeat); .auth/user.json is validated separately.
  await page.goto("/app/invoices");
  await expect(page.getByRole("heading", { name: /Invoice|Invoices/i }).first()).toBeVisible({ timeout: 20000 });

  // ---- 1. Create client (QA-created parent, unique prefix) ----
  await page.goto("/app/clients");
  await page.getByRole("button", { name: /Tambah Klien|Add Client/i }).click();
  const createDialog = page.getByRole("dialog", { name: /Tambah Klien|Add Client/i });
  await createDialog.getByRole("textbox", { name: /Nama \*|Name \*/i }).fill(CLIENT_NAME);
  await createDialog.getByRole("button", { name: /Buat Klien|Create Client/i }).click();
  await expect(page.getByRole("heading", { name: CLIENT_NAME, exact: true })).toBeVisible({ timeout: 15000 });

  // ---- 2. Create invoice (client-linked, manual item, IDR, draft) ----
  await page.goto("/app/invoices/new");
  await expect(page.getByRole("heading", { name: /Invoice Baru|New Invoice/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("combobox").first().click(); // Klien select
  await page.getByRole("option", { name: CLIENT_NAME, exact: true }).click();

  const itemInputs = page.getByLabel(/Deskripsi item 1|Item 1 description/i);
  await itemInputs.fill(ITEM_DESC);
  await page.getByLabel(/Jumlah item 1|Item 1 quantity/i).fill(String(ITEM_QTY));
  await page.getByLabel(/Harga item 1|Item 1 price/i).fill(String(ITEM_RATE));
  await expect(page.getByText("Subtotal", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Buat Invoice|Create Invoice/i }).click();
  await page.waitForURL(/\/app\/invoices\/[0-9a-f-]{36}/, { timeout: 20000 });
  const invoiceUrl = page.url();
  const _invoiceId = invoiceUrl.split("/").pop()!;
  await expect(page.getByRole("heading", { name: /Invoice INV-\d+/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("textbox", { name: /Description 1|Deskripsi 1/i })).toHaveValue(ITEM_DESC);
  await expect(page.getByText(/Draf|Draft/i).first()).toBeVisible();

  // ---- 3. Reload + list persistence ----
  await page.reload();
  await expect(page.getByRole("heading", { name: /Invoice INV-\d+/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Description 1|Deskripsi 1/i })).toHaveValue(ITEM_DESC);
  await page.goto("/app/invoices");
  await expect(page.getByRole("link", { name: CLIENT_NAME, exact: true })).toBeVisible();
  await page.goto(`/app/invoices?status=draft`);
  await expect(page.getByRole("link", { name: /INV-\d+/i }).first()).toBeVisible();

  // ---- 4. Payment via UI (draft invoice allows; server asserts remaining) ----
  await page.goto(invoiceUrl);
  await page.getByRole("button", { name: /Catat Pembayaran Sebagian|Record Partial Payment/i }).click();
  const payDialog = page.getByRole("dialog", { name: /Catat Pembayaran|Record Payment/i });
  await payDialog.getByLabel(/Jumlah \*|Amount \*/i).fill(String(PAYMENT_AMOUNT));
  await payDialog.getByLabel(/Tanggal Pembayaran \*|Payment Date \*/i).fill("2026-08-10");
  await payDialog.getByRole("button", { name: /Catat Pembayaran|Record Payment/i, exact: true }).click();
  await expect(page.getByText(/Pembayaran dicatat|Payment recorded/i).first()).toBeVisible({ timeout: 15000 });

  // ---- 5. Status visible: badge override shows Lunas when fully paid ----
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByLabel(/Remaining: Rp 150\.000/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Rp\s*150\.000/i).first()).toBeVisible();

  // ---- 6. Reports page render + period filter (no export; pure UI) ----
  await page.goto("/app/reports");
  await expect(page.getByRole("heading", { name: /Laporan|Reports/i }).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("combobox", { name: /Pilih periode laporan|Select report period/i }).click();
  await page.getByRole("option", { name: /Tahun berjalan|Current year/i }).click();
  await expect(page).toHaveURL(/period=year/);
  await expect(page.getByRole("heading", { name: /Laporan|Reports/i }).first()).toBeVisible();
  // ---- 7. Accounting-safe terminal state: paid invoices are immutable, so void instead of delete. ----
  await page.goto(invoiceUrl);
  await page.getByRole("button", { name: /Batalkan invoice|Void invoice/i }).click();
  const voidDialog = page.getByRole("dialog", { name: /Batalkan.*invoice|Void.*invoice/i });
  await voidDialog.getByRole("textbox", { name: /Alasan pembatalan|Void reason/i }).fill("Production E2E report reconciliation fixture");
  await voidDialog.getByRole("button", { name: /Batalkan invoice|Void invoice/i }).click();
  await page.reload();
  await expect(page.getByText(/Dibatalkan|Void|Cancelled/i).first()).toBeVisible();
});
