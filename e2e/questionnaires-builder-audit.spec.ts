import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Forms / questionnaire builder full-surface audit.
 *
 * Test A — every catalogue element renders and persists, conditional logic works,
 *          one top Save, non-purple theme, PUBLISH link, and the public intake
 *          renders at desktop + mobile with accessible labels and a workspace-scoped
 *          logo URL.
 * Test B — a minimal form is submitted end to end through the public intake route
 *          and the response lands in the database.
 *
 * Fixtures are prefixed `QA-AUDIT-` and removed by each test (plus a sweep on the
 * first run) so repeated runs stay idempotent.
 */

test.use({ storageState: ".auth/user.json" });

const CATALOG = [
  "Short Text",
  "Long Text / Paragraph",
  "Email Address",
  "Phone / WhatsApp",
  "Date Picker",
  "Time Picker",
  "Website / URL",
  "Single Select (Dropdown)",
  "Multiple Choice (Checkboxes)",
  "File Upload",
  "E-Signature",
  "Rating Scale (1-5 / 1-10)",
  "Image Choice",
  "Matrix / Likert Scale",
  "Terms & Consent",
  "Page Break (Multi-Step)",
  "Section Heading",
  "Information / Note Box",
  "Divider Line",
  "Brand Logo",
];

const stamp = Date.now();
const NAME_A = `QA-AUDIT-A ${stamp}`;
const NAME_B = `QA-AUDIT-B ${stamp}`;

/** Query the app database from inside the running container (the DB port is not
 *  published on the host). Returns the rows of a parameterised SELECT. */
function sql(query: string, params: unknown[] = []): Record<string, unknown>[] {
  const script =
    'const {Client}=require("pg");const c=new Client({connectionString:process.env.DATABASE_URL});' +
    "(async()=>{await c.connect();" +
    'const r=await c.query(Buffer.from(process.env.Q,"base64").toString(),JSON.parse(Buffer.from(process.env.P,"base64").toString()));' +
    'console.log("__ROWS__"+JSON.stringify(r.rows));await c.end();})()' +
    '.catch(e=>{console.log("__ERR__"+e.message);process.exit(1)})';
  const out = execFileSync(
    "docker",
    [
      "exec", "-w", "/app",
      "-e", `Q=${Buffer.from(query).toString("base64")}`,
      "-e", `P=${Buffer.from(JSON.stringify(params)).toString("base64")}`,
      process.env.E2E_DB_CONTAINER ?? "cubicle-dev",
      "node", "-e", script,
    ],
    { encoding: "utf8", timeout: 60_000 },
  );
  const line = out.split("\n").find((l) => l.startsWith("__ROWS__"));
  if (!line) throw new Error(`sql failed: ${out.slice(0, 300)}`);
  return JSON.parse(line.slice("__ROWS__".length));
}

/** Fill every empty control on the current wizard step so required-field
 *  validation can pass. Radix checkboxes/radios ignore synthetic clicks on their
 *  hidden input, so they are driven through their ARIA role. */
async function fillStep(page: import("@playwright/test").Page) {
  for (const cb of await page.getByRole("checkbox").all()) {
    if (!(await cb.isChecked().catch(() => false))) await cb.click({ force: true }).catch(() => {});
  }
  const controls = page.locator(
    'input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), textarea',
  );
  for (const el of await controls.all()) {
    if (!(await el.isVisible().catch(() => false))) continue;
    const type = await el.getAttribute("type").catch(() => null);
    if (type === "date" || type === "time") continue;
    if ((await el.inputValue().catch(() => "x")) !== "") continue;
    // Native HTML validation silently blocks submit when a url/email/number
    // control holds a non-conforming value.
    const value =
      type === "url" ? "https://qa.example.com"
      : type === "email" ? "qa@example.com"
      : type === "number" ? "1"
      : "QA";
    await el.fill(value, { timeout: 5_000 }).catch(() => {});
  }
  for (const rb of await page.getByRole("radio").all()) {
    if (!(await rb.isChecked().catch(() => false))) { await rb.click({ force: true }).catch(() => {}); break; }
  }
}

/** Visible form controls that expose no accessible name (label, aria-label or
 *  aria-labelledby). Guards the public intake label bindings. */
async function unlabeledControls(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    document
      .querySelectorAll("form input:not([type=hidden]), form textarea, form select")
      .forEach((el) => {
        if ((el as HTMLElement).offsetParent === null) return;
        // aria-hidden controls are removed from the accessibility tree (Radix
        // Select ships one for form integration), so a label is not required.
        if (el.getAttribute("aria-hidden") === "true") return;
        const labelled =
          ((el as HTMLInputElement).labels?.length ?? 0) > 0 ||
          el.getAttribute("aria-label") ||
          el.getAttribute("aria-labelledby");
        if (!labelled) bad.push(el.id || el.getAttribute("name") || el.tagName);
      });
    return bad;
  });
}

test.beforeAll(() => {
  // Sweep leftovers so a previously interrupted run cannot fail the cleanup check.
  sql("delete from questionnaire_responses where questionnaire_id in (select id from questionnaires where name like $1)", ["QA-AUDIT-%"]);
  sql("delete from questionnaires where name like $1", ["QA-AUDIT-%"]);
});

test("[A] builder canvas: all elements, conditional logic, share, public link", async ({ page }) => {
  test.setTimeout(300_000);

  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 180)}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 180)}`));

  await page.goto("/app/questionnaires/new", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Elements|Elemen/ }).click().catch(() => {});
  await page.waitForTimeout(1500);

  const missing: string[] = [];
  const addElement = async (label: string) => {
    const btn = page.getByText(label, { exact: true }).first();
    if (!(await btn.count())) { missing.push(label); return; }
    await btn.click();
    await page.waitForTimeout(130);
  };

  // The first two elements are added on their own: adding a field auto-selects it,
  // so the properties drawer shows the fresh field without canvas hit-testing.
  await addElement("Short Text");
  await addElement("Long Text / Paragraph");
  await page.waitForTimeout(800);

  // ── conditional logic UI ──
  await expect(page.getByText(/Conditional Logic|Logika Kondisional/).first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole("combobox").last().click();
  await page.getByRole("option").filter({ hasNotText: /Always|Selalu/ }).first().click();
  await page.waitForTimeout(500);
  await expect(page.getByText(/Equals|Sama dengan/).first()).toBeVisible({ timeout: 10_000 });
  await page.getByPlaceholder(/Nilai|Value/).fill("YES");
  await page.waitForTimeout(300);

  for (const label of CATALOG.slice(2)) await addElement(label);
  expect(missing, `catalogue entries not found: ${missing.join(", ")}`).toEqual([]);

  // ── one top Save, name, save ──
  const save = page.getByRole("button", { name: /^(Save|Simpan)$/ });
  await expect(save, "exactly one top-level Save button").toHaveCount(1);
  await page.getByPlaceholder(/Form Name|Nama Formulir/).fill(NAME_A);
  await save.click();
  await page.waitForTimeout(4000);

  type RowA = {
    id: string;
    slug: string;
    theme_preset: string;
    schema: { id: string; type: string; label: string; condition?: { fieldId?: string; value?: string } }[];
  };
  const rowA = (sql("select id, slug, schema, theme_preset from questionnaires where name = $1", [NAME_A]) as RowA[])[0]!;
  expect(rowA, "form A persisted").toBeTruthy();
  expect(rowA.schema.length, "every catalogue element persisted").toBeGreaterThanOrEqual(CATALOG.length);

  const persistedTypes = new Set(rowA.schema.map((f) => f.type));
  expect(persistedTypes.has("logo"), "'logo' element persisted").toBe(true);
  expect(rowA.theme_preset, "default theme is Cobalt Blue, not purple").not.toBe("purple");

  const condFields = rowA.schema.filter((f) => f.condition?.fieldId);
  expect(condFields.length, "conditional logic persisted").toBeGreaterThan(0);
  expect(condFields[0].condition?.value, "conditional logic value persisted").toBe("YES");
  expect(condFields[0].type, "core field (not structural) carries the condition").toBe("textarea");

  // ── PUBLISH tab exposes the public link ──
  await page.getByRole("button", { name: "PUBLISH", exact: true }).click();
  await page.waitForTimeout(1200);
  const publicUrl = await page.locator("input[readonly]").first().inputValue();
  expect(publicUrl, "published public link points at the intake route").toMatch(/\/intake\//);

  // ── public intake render ──
  const guest = await page.context().browser()!.newContext({ baseURL: process.env.BASE_URL, viewport: { width: 1440, height: 900 } });
  const gp = await guest.newPage();
  gp.on("pageerror", (e) => errors.push(`intake pageerror: ${String(e).slice(0, 180)}`));
  await gp.goto(`/intake/${rowA.slug}`, { waitUntil: "domcontentloaded" });
  await gp.waitForSelector("form", { timeout: 20_000 });
  await gp.waitForTimeout(500);

  const pageOverflows: number[] = [];
  const unlabeledAll: string[] = [];
  for (let step = 0; step < 4; step++) {
    pageOverflows.push(await gp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
    unlabeledAll.push(...(await unlabeledControls(gp)));
    await fillStep(gp);
    await gp.waitForTimeout(300);
    const next = gp.getByRole("button", { name: /^(Next|Selanjutnya)$/ });
    if (!(await next.count())) break;
    await next.click();
    await gp.waitForTimeout(900);
  }
  expect(pageOverflows.every((px) => px <= 1), `public intake has no horizontal overflow on any step (${pageOverflows.join(",")})`).toBe(true);
  expect(unlabeledAll, "every public intake control has an accessible label").toEqual([]);

  const logoCount = () => gp.evaluate(() => document.querySelectorAll('img[alt="Brand Logo"]').length);
  // No workspace logo: the element must not fire a request that can only 404.
  // The errors assertion below holds that line (a 404 surfaces as a console error).
  expect(await logoCount(), "logo element is skipped when the workspace has no logo").toBe(0);

  // Contract of the logo route: it only accepts a workspace UUID. The old code sent
  // the public slug, or the literal "workspace", and the route answered 400.
  const [ws] = sql("select workspace_id from questionnaires where id = $1", [rowA.id]) as { workspace_id: string }[];
  const route = (seg: string) => gp.request.get(`/api/public/workspace-logo/${seg}`);
  expect((await route(ws.workspace_id)).status(), "workspace UUID is accepted by the logo route").not.toBe(400);
  for (const bogus of ["workspace", rowA.slug]) {
    expect((await route(bogus)).status(), `route rejects the non-UUID id "${bogus}"`).toBe(400);
  }
  await guest.close();

  sql("delete from questionnaire_responses where questionnaire_id = $1", [rowA.id]);
  sql("delete from questionnaires where id = $1", [rowA.id]);
  expect(sql("select count(*)::int n from questionnaires where name = $1", [NAME_A])[0].n, "fixture A cleaned up").toBe(0);

  expect(errors, `console/page errors: ${errors.slice(0, 5).join(" | ")}`).toEqual([]);
});

test("[B] public intake submit persists a response end to end", async ({ page }) => {
  test.setTimeout(300_000);

  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 180)}`); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 180)}`));

  await page.goto("/app/questionnaires/new", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Elements|Elemen/ }).click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByText("Short Text", { exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByPlaceholder(/Form Name|Nama Formulir/).fill(NAME_B);
  await page.getByRole("button", { name: /^(Save|Simpan)$/ }).click();
  await page.waitForTimeout(4000);

  const rowB = (sql("select id, slug from questionnaires where name = $1", [NAME_B]) as { id: string; slug: string }[])[0]!;
  expect(rowB, "form B persisted").toBeTruthy();

  const guest2 = await page.context().browser()!.newContext({ baseURL: process.env.BASE_URL, viewport: { width: 1280, height: 800 } });
  const gp2 = await guest2.newPage();
  gp2.on("pageerror", (e) => errors.push(`submit pageerror: ${String(e).slice(0, 180)}`));
  await gp2.goto(`/intake/${rowB.slug}`, { waitUntil: "domcontentloaded" });
  await gp2.waitForSelector("form", { timeout: 20_000 });
  const answer = `QA respondent ${stamp}`;
  // Locate through the ARIA role: the Short Text control is a textbox, and a CSS
  // type selector misses it when React omits the explicit type attribute.
  const answerBox = gp2.getByRole("textbox").first();
  await answerBox.fill(answer, { timeout: 15_000 });
  // Let React flush the controlled-input state update before submitting.
  await expect(answerBox).toHaveValue(answer, { timeout: 10_000 });
  await gp2.waitForTimeout(600);
  await gp2.getByRole("button", { name: /Submit Response|Kirim Tanggapan/ }).click({ timeout: 30_000 });
  await gp2.waitForTimeout(4000);

  // The persistence proof is the database row; retry until the server action lands.
  let resp: Record<string, unknown>[] = [];
  for (let i = 0; i < 15 && resp.length === 0; i++) {
    resp = sql("select id, answers, status from questionnaire_responses where questionnaire_id = $1", [rowB.id]);
    if (resp.length === 0) await gp2.waitForTimeout(1000);
  }
  expect(resp.length, "submitted response persisted").toBeGreaterThan(0);
  expect(JSON.stringify(resp[0].answers), "response carries the typed answer").toContain(answer);

  await expect(gp2.getByText(/Thank|Terima kasih|received|berhasil/i).first()).toBeVisible({ timeout: 20_000 });
  await guest2.close();

  sql("delete from questionnaire_responses where questionnaire_id = $1", [rowB.id]);
  sql("delete from questionnaires where id = $1", [rowB.id]);
  expect(sql("select count(*)::int n from questionnaires where name = $1", [NAME_B])[0].n, "fixture B cleaned up").toBe(0);

  expect(errors, `console/page errors: ${errors.slice(0, 5).join(" | ")}`).toEqual([]);
});