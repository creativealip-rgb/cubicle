import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

const ids: { proposal?: string; contract?: string; form?: string } = {};

function sql(query: string, params: unknown[] = []) {
  const script = 'const {Client}=require("pg");const c=new Client({connectionString:process.env.DATABASE_URL});(async()=>{await c.connect();await c.query(Buffer.from(process.env.Q,"base64").toString(),JSON.parse(Buffer.from(process.env.P,"base64").toString()));await c.end()})().catch(e=>{console.error(e);process.exit(1)})';
  execFileSync("docker", ["exec", "-w", "/app", "-e", `Q=${Buffer.from(query).toString("base64")}`, "-e", `P=${Buffer.from(JSON.stringify(params)).toString("base64")}`, process.env.E2E_DB_CONTAINER ?? "cubicle-dev", "node", "-e", script]);
}

async function assertSurface(page: Page, name: string) {
  await expect(page.getByRole("button", { name: "BUILD" })).toBeVisible();
  await expect(page.getByRole("button", { name: "SETTINGS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "PUBLISH" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^(Save|Simpan)$/ })).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${name} horizontal overflow`).toBeLessThanOrEqual(1);
  await page.screenshot({ path: `/tmp/${name}-${page.viewportSize()!.width}.png`, fullPage: true });
}

test.use({ storageState: ".auth/user.json" });
test.describe.serial("builder responsive surfaces", () => {
  test.afterAll(() => {
    if (ids.proposal) sql("delete from proposals where id=$1", [ids.proposal]);
    if (ids.contract) sql("delete from contracts where id=$1", [ids.contract]);
    if (ids.form) {
      sql("delete from questionnaire_responses where questionnaire_id=$1", [ids.form]);
      sql("delete from questionnaires where id=$1", [ids.form]);
    }
  });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    test(`proposal contract form ${viewport.width}px`, async ({ browser }) => {
      test.setTimeout(180_000);
      const context = await browser.newContext({ baseURL: process.env.BASE_URL, storageState: ".auth/user.json", viewport });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
      page.on("pageerror", e => errors.push(String(e)));

      if (!ids.proposal) {
        await page.goto("/app/proposals");
        await page.getByRole("button", { name: /New proposal|Proposal baru/ }).first().click();
        await page.waitForURL(/proposals\/[0-9a-f-]{36}\/edit/);
        ids.proposal = page.url().match(/proposals\/([0-9a-f-]{36})/)![1];
      } else await page.goto(`/app/proposals/${ids.proposal}/edit`);
      await assertSurface(page, "proposal-builder");
      await page.getByRole("button", { name: "SETTINGS" }).click();
      await expect(page.getByLabel(/Document Title|Judul Dokumen/)).toBeVisible();

      if (!ids.contract) {
        await page.goto("/app/contracts");
        await page.getByRole("button", { name: /New contract|Kontrak baru/ }).first().click();
        await page.waitForURL(/contracts\/[0-9a-f-]{36}\/edit/);
        ids.contract = page.url().match(/contracts\/([0-9a-f-]{36})/)![1];
      } else await page.goto(`/app/contracts/${ids.contract}/edit`);
      await assertSurface(page, "contract-builder");
      await page.getByRole("button", { name: "SETTINGS" }).click();
      await expect(page.getByLabel(/Contract Number|Nomor Kontrak/)).toBeVisible();

      await page.goto(ids.form ? `/app/questionnaires/${ids.form}/edit` : "/app/questionnaires/new");
      if (!ids.form) {
        await page.getByPlaceholder(/Form Name|Nama Formulir/).fill(`QA Responsive ${Date.now()}`);
        await page.getByRole("button", { name: /^(Save|Simpan)$/ }).click();
        await page.waitForURL(/questionnaires\/[0-9a-f-]{36}(?:\/edit)?$/);
        ids.form = page.url().match(/questionnaires\/([0-9a-f-]{36})/)![1];
        await page.goto(`/app/questionnaires/${ids.form}/edit`);
      }
      await assertSurface(page, "form-builder");
      expect(errors, errors.slice(0, 3).join(" | ")).toEqual([]);
      await context.close();
    });
  }
});
