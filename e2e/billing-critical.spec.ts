import { expect, test, type Page } from "@playwright/test";

if (process.env.ALLOW_BILLING_E2E !== "1") {
  test.skip(true, "Set ALLOW_BILLING_E2E=1 to permit disposable billing mutations");
}

test.use({ storageState: ".auth/user.json" });
test.describe.configure({ mode: "serial", retries: 0 });

const idFromUrl = (url: string) => url.match(/[0-9a-f-]{36}/)?.[0] ?? "";

async function createClient(page: Page, name: string) {
  await page.goto("/app/clients");
  await page.getByRole("button", { name: /^(New|Baru|Tambah)$/ }).click();
  await page.getByRole("menuitem", { name: /Client|Klien/ }).click();
  await page.getByLabel(/Client Name|Nama Klien|Nama \*/i).fill(name);
  await page.getByRole("button", { name: /Create Client|Buat Klien/i }).click();
  await page.waitForURL(/\/app\/clients\/[0-9a-f-]{36}/);
  return idFromUrl(page.url());
}

async function createProject(page: Page, client: string, name: string) {
  await page.goto("/app/projects");
  await page.getByRole("button", { name: /New Project|Proyek Baru/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Project Name|Nama Proyek/i).fill(name);
  await dialog.getByPlaceholder(/Search client|Cari klien/i).fill(client);
  await page.getByText(client, { exact: true }).click();
  await dialog.getByRole("button", { name: /Create Project|Buat Proyek/i }).click();
  await page.getByText(name, { exact: true }).first().click();
  await page.waitForURL(/\/app\/projects\/[0-9a-f-]{36}/);
  return idFromUrl(page.url());
}

async function deleteInvoice(page: Page, id: string) {
  await page.goto(`/app/invoices/${id}`);
  await page.getByRole("button", { name: /^Delete$|^Hapus$/i }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Delete Permanently|Hapus Permanen/i }).click();
}

async function cleanup(page: Page, ids: { invoices: string[]; project?: string; client?: string }, names: { project: string; client: string }) {
  for (const id of ids.invoices) {
    if (!id) continue;
    await deleteInvoice(page, id).catch(() => undefined);
  }
  if (ids.project) {
    await page.goto(`/app/projects/${ids.project}`);
    await page.getByRole("button", { name: /Project actions|Aksi proyek/i }).click();
    await page.getByRole("menuitem", { name: /Delete Permanently|Hapus Permanen/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").fill(names.project);
    await dialog.getByRole("button", { name: /Delete Permanently|Hapus Permanen/i }).click();
  }
  if (ids.client) {
    await page.goto(`/app/clients/${ids.client}`);
    await page.getByRole("button", { name: /Client actions|Aksi klien/i }).click();
    await page.getByRole("menuitem", { name: /^Delete$|^Hapus$/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input").fill(names.client);
    await dialog.getByRole("button", { name: /Delete Permanently|Hapus Permanen/i }).click();
  }
}

async function configureBilling(page: Page, model: "fixed_price" | "retainer", values: string[]) {
  await page.getByRole("button", { name: /Edit billing settings|Ubah pengaturan tagihan/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("select").first().selectOption(model);
  const numbers = dialog.locator("input[type=number]");
  for (let i = 0; i < values.length; i++) await numbers.nth(i).fill(values[i]);
  await dialog.getByRole("button", { name: /^Save$|^Simpan$/i }).click();
}

async function configureRetainerOverage(page: Page) {
  await page.getByRole("button", { name: /Edit billing settings|Ubah pengaturan tagihan/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("select").first().selectOption("retainer");
  const numbers = dialog.locator("input[type=number]");
  await numbers.nth(0).fill("500000");
  await numbers.nth(1).fill("10");
  await numbers.nth(2).fill("1");
  await dialog.locator('[role="combobox"]').last().click();
  await page.getByRole("option", { name: /Bill Overage|Tagih Kelebihan/i }).click();
  await dialog.locator("input[type=number]").last().fill("120000");
  await dialog.getByRole("button", { name: /^Save$|^Simpan$/i }).click();
}

async function createFixedInvoice(page: Page, projectId: string, number: string, source: RegExp, value?: string, milestone?: string) {
  await page.goto(`/app/projects/${projectId}?tab=billing`);
  await page.getByRole("button", { name: /Create Invoice|Buat Invoice/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/Invoice Number|Nomor Invoice/i).fill(number);
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: source }).click();
  if (value) {
    await dialog.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /Percent|Persen/i }).click();
    if (milestone) await dialog.getByPlaceholder(/Milestone name|Nama milestone/i).fill(milestone);
    await dialog.getByPlaceholder(/Percent|Persen/i).fill(value);
  }
  await dialog.getByRole("button", { name: /Create Invoice|Buat Invoice/i }).click();
  await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]{36}/);
  await page.goto(`/app/projects/${projectId}?tab=billing`);
  const href = await page.locator('a[href*="/app/invoices/"]:visible', { hasText: number }).getAttribute("href");
  if (!href) throw new Error("Created invoice link missing");
  return idFromUrl(href);
}

test("fixed DP, milestone, final, exhausted guard, and draft reversal", async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const stamp = Date.now();
  const names = { client: `QA-BILL-FIX-${stamp} Client`, project: `QA-BILL-FIX-${stamp} Fixed` };
  const ids: { client?: string; project?: string; invoices: string[] } = { invoices: [] };
  try {
    ids.client = await createClient(page, names.client);
    ids.project = await createProject(page, names.client, names.project);
    await configureBilling(page, "fixed_price", ["1000000"]);
    const dp = await createFixedInvoice(page, ids.project, `QA-FIX-DP-${stamp}`, /Down payment|DP/i, "30");
    ids.invoices.push(dp);
    const milestone = await createFixedInvoice(page, ids.project, `QA-FIX-MS-${stamp}`, /Milestone/i, "40", "Phase 1");
    ids.invoices.push(milestone);
    await deleteInvoice(page, milestone);
    ids.invoices = ids.invoices.filter((id) => id !== milestone);
    const replacement = await createFixedInvoice(page, ids.project, `QA-FIX-MS2-${stamp}`, /Milestone/i, "40", "Phase 1 replacement");
    ids.invoices.push(replacement);
    const final = await createFixedInvoice(page, ids.project, `QA-FIX-FINAL-${stamp}`, /Remaining balance|Pelunasan sisa/i);
    ids.invoices.push(final);
    await page.goto(`/app/projects/${ids.project}?tab=billing`);
    await page.getByRole("button", { name: /Create Invoice|Buat Invoice/i }).click();
    await expect(page.getByRole("dialog").getByRole("button", { name: /Create Invoice|Buat Invoice/i })).toBeDisabled();
    await expect(page.locator("main")).toContainText(`QA-FIX-DP-${stamp}`);
    await expect(page.locator("main")).toContainText(`QA-FIX-MS2-${stamp}`);
    await expect(page.locator("main")).toContainText(`QA-FIX-FINAL-${stamp}`);
    await expect(page.locator("main")).toContainText(/Rp\s*400\.000/);
  } finally {
    await cleanup(page, ids, names);
  }
});

test("retainer manual time overage, delete restoration, and regeneration", async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(15_000);
  const stamp = Date.now();
  const names = { client: `QA-BILL-RET-${stamp} Client`, project: `QA-BILL-RET-${stamp} Retainer` };
  const ids: { client?: string; project?: string; invoices: string[] } = { invoices: [] };
  try {
    ids.client = await createClient(page, names.client);
    ids.project = await createProject(page, names.client, names.project);
    await configureRetainerOverage(page);

    await page.goto(`/app/projects/${ids.project}`);
    await page.getByRole("tab", { name: /Tasks|Tugas/i }).click();
    await page.getByRole("button", { name: /New Task|Tugas Baru/i }).click();
    let dialog = page.getByRole("dialog");
    await dialog.locator("input").first().fill(`${names.project} Task`);
    await dialog.getByRole("button", { name: /Create Task|Buat Tugas/i }).click();

    await page.goto("/app/time");
    await page.getByRole("button", { name: /Log Time|Catat Waktu/i }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder(/Search project|Cari proyek/i).fill(names.project);
    await page.getByText(names.project, { exact: true }).click();
    await dialog.locator("input").nth(1).fill(names.project);
    await page.getByText(`${names.project} Task`, { exact: true }).click();
    await dialog.locator("textarea").fill(`${names.project} Work`);
    await dialog.getByPlaceholder("00:00:00").fill("00:40:00");
    await dialog.getByRole("button", { name: /Add time log|Tambah catatan waktu/i }).click();

    await page.goto(`/app/projects/${ids.project}?tab=billing`);
    await page.locator("main input").fill(`QA-RET-A-${stamp}`);
    await page.getByRole("button", { name: /Create Invoice|Buat Invoice/i }).click();
    await expect(page.locator("main")).toContainText(/Rp\s*560\.000/);
    let href = await page.locator('a[href*="/app/invoices/"]').last().getAttribute("href");
    if (!href) throw new Error("Retainer invoice link missing");
    const first = idFromUrl(href);
    ids.invoices.push(first);
    await deleteInvoice(page, first);
    ids.invoices = [];

    await page.goto(`/app/projects/${ids.project}?tab=billing`);
    await page.locator("main input").fill(`QA-RET-B-${stamp}`);
    await page.getByRole("button", { name: /Create Invoice|Buat Invoice/i }).click();
    await expect(page.locator("main")).toContainText(/Rp\s*560\.000/);
    href = await page.locator('a[href*="/app/invoices/"]').last().getAttribute("href");
    if (!href) throw new Error("Regenerated invoice link missing");
    ids.invoices.push(idFromUrl(href));
    await page.locator("main input").fill(`QA-RET-C-${stamp}`);
    await page.getByRole("button", { name: /Create Invoice|Buat Invoice/i }).click();
    await expect(page.getByText(/already invoiced|sudah ditagihkan/i)).toBeVisible();
  } finally {
    await cleanup(page, ids, names);
  }
});
