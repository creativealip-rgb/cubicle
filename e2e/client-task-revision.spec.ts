import { test, expect, type Page } from "@playwright/test";
import pg from "pg";

const email = process.env.E2E_EMAIL!;
const password = process.env.E2E_PASSWORD!;
const databaseUrl = process.env.DATABASE_URL!;
let loginAttempt = 0;

async function login(page: Page, workspaceId?: string) {
  await page.addInitScript(() => {
    if (!globalThis.crypto.randomUUID) {
      globalThis.crypto.randomUUID = () => {
        const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
        return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}` as `${string}-${string}-${string}-${string}-${string}`;
      };
    }
  });
  loginAttempt += 1;
  const response = await page.request.post("/api/auth/sign-in/email", {
    headers: { "CF-Connecting-IP": `10.99.1.${loginAttempt}`, "X-Forwarded-For": `10.99.1.${loginAttempt}` },
    data: { email, password },
  });
  expect(response.status(), await response.text()).toBe(200);
  if (workspaceId) {
    const base = new URL(process.env.BASE_URL!);
    await page.context().addCookies([{ name: "active_workspace_id", value: workspaceId, domain: base.hostname, path: "/" }]);
  }
  await page.goto("/app/tasks", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Tugas", exact: true })).toBeVisible();
}

async function templateState(templateName: string) {
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const { rows } = await db.query<{ status: string; target: string }>("select status,target from task_templates where name=$1", [templateName]);
    return rows[0] ?? null;
  } finally {
    await db.end();
  }
}

async function templateItemTitles(templateName: string) {
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const { rows } = await db.query<{ title: string }>("select i.title from task_template_items i join task_templates t on t.id=i.template_id where t.name=$1 order by i.position", [templateName]);
    return rows.map(row => row.title);
  } finally {
    await db.end();
  }
}

async function seedRevisionFixture() {
  const db = new pg.Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    const { rows: users } = await db.query<{ id: string }>("select id from users where email=$1", [email]);
    const userId = users[0]?.id;
    if (!userId) throw new Error(`Missing QA user ${email}`);
    await db.query("update users set plan='team', plan_expires_at=null where id=$1", [userId]);
    const slug = `client-task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const { rows: workspaces } = await db.query<{ id: string }>("insert into workspaces(name,slug,owner_id,plan) values($1,$2,$3,'team') returning id", ["Client Task Revision QA", slug, userId]);
    const workspaceId = workspaces[0].id;
    await db.query("insert into workspace_members(workspace_id,user_id,role) values($1,$2,'owner') on conflict do nothing", [workspaceId, userId]);
    const { rows: clients } = await db.query<{ id: string }>("insert into clients(workspace_id,name,email,status,portal_enabled,portal_slug) values($1,'Klien Revisi QA','client-revision@example.test','active',true,$2) returning id", [workspaceId, `${slug}-portal`]);
    const clientId = clients[0].id;
    const { rows: projects } = await db.query<{ id: string }>("insert into projects(workspace_id,client_id,name,status,billing_model,billing_type,budget,currency,created_by) values($1,$2,'Proyek Revisi QA','active','fixed_price','fixed_price',1500000,'IDR',$3) returning id", [workspaceId, clientId, userId]);
    const projectId = projects[0].id;
    for (let i = 1; i <= 12; i++) {
      await db.query("insert into tasks(workspace_id,project_id,title,status,priority,position,created_by,behavior,mode,lifecycle) values($1,$2,$3,'todo','medium',$4,$5,$6,$7,'active')", [workspaceId, projectId, `Task QA ${String(i).padStart(2, "0")}`, i, userId, i % 2 ? "one_time" : "recurring", i % 2 ? "workflow" : "reusable"]);
    }
    const { rows: templates } = await db.query<{ id: string }>("insert into task_templates(workspace_id,name,description,target,status,created_by) values($1,'Template QA','Template QA','all','active',$2) returning id", [workspaceId, userId]);
    await db.query("insert into task_template_items(workspace_id,template_id,title,description,position) values($1,$2,'Item Template QA','Item desc',0)", [workspaceId, templates[0].id]);
    await db.query("insert into invoices(workspace_id,client_id,project_id,invoice_number,status,issue_date,due_date,currency,subtotal,total) values($1,$2,$3,$4,'draft',current_date,current_date + interval '14 days','IDR',1500000,1500000)", [workspaceId, clientId, projectId, `QA-${Date.now()}`]);
    return { workspaceId, clientId, projectId };
  } finally {
    await db.end();
  }
}

for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
  test.describe(viewport.name, () => {
    test.use({ viewport });
    test("Task pagination, tabs, templates, and mixed-mode rows render without overflow/errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      const { workspaceId } = await seedRevisionFixture();
      await login(page, workspaceId);
      await expect(page.getByRole("tab", { name: "Tugas Proyek" })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByText("Task QA 12")).toBeVisible();
      await expect(page.getByText("Task QA 01")).not.toBeVisible();
      await expect(page.getByText("Halaman 1 dari 2")).toBeVisible();
      await page.getByRole("link", { name: "Berikutnya" }).click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByText("Task QA 01")).toBeVisible();
      await expect(page.getByText("Halaman 2 dari 2")).toBeVisible();
      await page.goto("/app/tasks?tab=templates", { waitUntil: "networkidle" });
      expect(errors.filter(error => !error.includes("favicon"))).toEqual([]);
      await expect(page.getByRole("tab", { name: "Template Tugas" })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("button", { name: "Buat Template" })).toBeVisible();
      await expect(page.getByText("Template QA", { exact: true })).toBeVisible();
      await expect(page.getByText("Item Template QA", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Import Template" })).toBeVisible();
      await expect(page.locator("body").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).resolves.toBe(true);
      expect(errors.filter(error => !error.includes("favicon"))).toEqual([]);
    });
  });
}

test("Template CRUD, item reorder, and zero-selection import guard persist", async ({ page }) => {
  const { workspaceId } = await seedRevisionFixture();
  await login(page, workspaceId);
  await page.goto("/app/tasks?tab=templates", { waitUntil: "networkidle" });

  const templateName = `Template Mutation ${Date.now()}`;
  await page.getByRole("button", { name: "Buat Template" }).click();
  let dialog = page.getByRole("dialog", { name: "Buat Template" });
  await dialog.locator("input").nth(0).fill(templateName);
  await dialog.locator("input").nth(1).fill("Template mutation QA");
  await dialog.locator("select").selectOption("fixed_price");
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByText(templateName, { exact: true })).toBeVisible();

  const templateRow = () => page.getByText(templateName, { exact: true }).locator("xpath=ancestor::div[contains(@class,'border-b')][1]");
  await templateRow().getByRole("button", { name: "Tambah item" }).click();
  dialog = page.getByRole("dialog", { name: "Tambah Item" });
  await dialog.getByPlaceholder("Judul").fill("Item A");
  await dialog.getByPlaceholder("Deskripsi").fill("Desc A");
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await templateRow().getByRole("button", { name: "Tambah item" }).click();
  dialog = page.getByRole("dialog", { name: "Tambah Item" });
  await dialog.getByPlaceholder("Judul").fill("Item B");
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(templateRow().getByText("Item A", { exact: true })).toBeVisible();
  await expect(templateRow().getByText("Item B", { exact: true })).toBeVisible();

  const itemBRow = templateRow().getByText("Item B", { exact: true }).locator("xpath=ancestor::div[contains(@class,'flex')][1]");
  await itemBRow.getByRole("button", { name: "↑" }).click();
  await expect.poll(() => templateItemTitles(templateName)).toEqual(["Item B", "Item A"]);
  await page.reload({ waitUntil: "networkidle" });
  await expect(templateRow().locator(".mt-3 > div").nth(0)).toContainText("Item B");
  await templateRow().getByText("Item B", { exact: true }).locator("xpath=ancestor::div[contains(@class,'flex')][1]").getByRole("button", { name: "Ubah" }).click();
  dialog = page.getByRole("dialog", { name: "Ubah Item" });
  await dialog.getByPlaceholder("Judul").fill("Item B Edited");
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(templateRow().getByText("Item B Edited", { exact: true })).toBeVisible();
  await templateRow().getByText("Item A", { exact: true }).locator("xpath=ancestor::div[contains(@class,'flex')][1]").getByRole("button", { name: "Hapus" }).click();
  await expect(templateRow().getByText("Item A", { exact: true })).toHaveCount(0);

  await templateRow().getByRole("button", { name: "Ubah Template" }).click();
  dialog = page.getByRole("dialog", { name: "Ubah Template" });
  await dialog.locator("input").nth(1).fill("Template edited QA");
  await dialog.locator("select").selectOption("all");
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect.poll(() => templateState(templateName)).toMatchObject({ target: "all" });
  await page.reload({ waitUntil: "networkidle" });
  await expect(templateRow()).toContainText("Semua Project");

  await templateRow().getByRole("button", { name: "Duplikat" }).click();
  await expect.poll(() => templateState(`${templateName} (Salinan)`)).toMatchObject({ status: "active" });
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText(`${templateName} (Salinan)`, { exact: true })).toBeVisible();
  await templateRow().getByRole("button", { name: "Arsipkan" }).click();
  await expect.poll(() => templateState(templateName)).toMatchObject({ status: "archived" });
  await page.reload({ waitUntil: "networkidle" });
  await expect(templateRow()).toContainText("archived");
  await expect(templateRow().getByRole("button", { name: "Tambah item" })).toHaveCount(0);
  await templateRow().getByRole("button", { name: "Pulihkan" }).click();
  await expect.poll(() => templateState(templateName)).toMatchObject({ status: "active" });
  await page.reload({ waitUntil: "networkidle" });
  await expect(templateRow()).toContainText("active");

  await page.getByRole("button", { name: "Import Template" }).click();
  const importDialog = page.getByRole("dialog", { name: "Import Template Tugas" });
  await expect(importDialog.getByRole("button", { name: "Lihat Preview" })).toBeDisabled();
  await expect(importDialog.getByRole("button", { name: "Import Tugas Terpilih" })).toBeDisabled();
});

test("Client scoped Project and Invoice persist with Portal password owner lifecycle", async ({ page }) => {
  const { workspaceId, clientId, projectId } = await seedRevisionFixture();
  await login(page, workspaceId);
  await page.goto(`/app/clients/${clientId}?tab=projects`, { waitUntil: "networkidle" });
  await expect(page.getByRole("tab", { name: /Proyek/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Tambah Proyek" })).toBeVisible();
  await page.getByRole("button", { name: "Tambah Proyek" }).click();
  const projectDialog = page.getByRole("dialog");
  await expect(projectDialog).toBeVisible();
  await expect(page.getByText("Klien *")).not.toBeVisible();
  const projectName = `Project Created ${Date.now()}`;
  await projectDialog.locator("input").nth(0).fill(projectName);
  await projectDialog.locator("input").nth(2).fill("750000");
  await projectDialog.getByRole("button", { name: "Simpan" }).click();
  await expect(projectDialog).not.toBeVisible();
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/app/clients/${clientId}\\?tab=projects`));
  await page.goto(`/app/projects/${projectId}`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Invoice/ }).click();
  await expect(page.getByRole("button", { name: "Buat Invoice" })).toBeVisible();
  await page.getByRole("button", { name: "Buat Invoice" }).click();
  const invoiceDialog = page.getByRole("dialog", { name: "Buat Invoice Proyek" });
  await expect(invoiceDialog).toBeVisible();
  await expect(page.getByText("Pilih klien")).not.toBeVisible();
  await invoiceDialog.getByLabel("Deskripsi item 1").fill("Invoice QA Item");
  await invoiceDialog.getByLabel("Harga item 1").fill("250000");
  await invoiceDialog.getByRole("button", { name: "Buat Invoice", exact: true }).click();
  await expect(invoiceDialog).not.toBeVisible();
  await expect(page.getByRole("tab", { name: "Invoice (2)" })).toBeVisible();
  await page.goto(`/app/clients/${clientId}?tab=portal`, { waitUntil: "networkidle" });
  await expect(page.getByLabel("Salin link portal")).toBeVisible();
  await expect(page.getByLabel("Buka portal klien")).toBeVisible();
  await expect(page.getByLabel("Salin link portal")).toBeEnabled();
  const portalPassword = "PortalQA2026!";
  await page.getByLabel("Atur password").fill(portalPassword);
  await page.getByRole("button", { name: "Simpan & aktifkan" }).click();
  const revealButton = page.locator('button[aria-label="Tampilkan password"]:visible');
  await expect(revealButton).toBeVisible();
  const maskedPassword = page.locator("code:visible", { hasText: "••••••••" });
  await expect(maskedPassword).toBeVisible();
  await revealButton.click();
  await expect(page.locator("code:visible", { hasText: portalPassword })).toBeVisible();
  await expect(page.locator('button[aria-label="Salin password"]:visible')).toBeVisible();
  await page.locator('button[aria-label="Sembunyikan password"]:visible').click();
  await expect(maskedPassword).toBeVisible();
});
