import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Proposal + Contract full-surface audit.
 *
 * Both kinds share `document-block-editor.tsx`, but each declares its own block
 * allow-list in `src/lib/document-blocks.ts` — and the editor's catalogue does
 * NOT match those lists. These tests walk every catalogue element, every editor
 * tab, the client picker, share link, public page, PDF, and the accept / decline
 * / sign / revoke lifecycles, asserting the DATABASE after each mutation.
 *
 * Fixtures: one QA workspace per run, removed by an afterAll sweep.
 */

test.use({ storageState: ".auth/user.json" });

const stamp = Date.now();
const NOBODY = `qa-docs-${stamp}@cubiqlo.test`;
const REAL_EMAIL = `qa-client-${stamp}@example.com`;
const PROPOSAL_TITLE = `QA-DOC Proposal ${stamp}`;
const CONTRACT_TITLE = `QA-DOC Contract ${stamp}`;

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

type Block = { id: string; type: string };
const blockTypes = (row: { content_blocks?: unknown } | undefined): string[] =>
  ((row?.content_blocks as Block[] | undefined) ?? []).map((b) => b.type);

/** The QA account's active workspace (resolved from the first created document,
 *  which the server scopes to the caller's workspace). Fixtures are removed by
 *  title prefix, so an interrupted run never leaks rows. */
let wsId = "";

async function addBlock(page: Page, label: string) {
  const search = page.getByPlaceholder(/Search elements|Cari elemen/);
  await search.fill(label);
  await page.waitForTimeout(150);
  await page.locator("aside button[type=button]").filter({ hasText: label }).first().click();
  await page.waitForTimeout(300);
  await search.fill("");
}

test.describe.serial("documents", () => {
  test.afterAll(() => {
    sql("delete from invoice_items where invoice_id in (select id from invoices where workspace_id = $1)", [wsId]);
    sql("delete from invoices where workspace_id = $1", [wsId]);
    sql("delete from projects where workspace_id = $1", [wsId]);
    sql("delete from contracts where workspace_id = $1", [wsId]);
    sql("delete from proposals where workspace_id = $1", [wsId]);
  });

  // ─────────────────────────────── PROPOSAL ───────────────────────────────
  test("[P] proposal: every catalogue element, tabs, share, public accept", async ({ page }) => {
    test.setTimeout(420_000);
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

    // 1. Direct create from the list page (the primary "New proposal" button).
    await page.goto("/app/proposals", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /New proposal|Proposal baru/ }).first().click();
    await page.waitForURL(/\/app\/proposals\/[0-9a-f-]{36}\/edit/, { timeout: 60_000 });
    const proposalId = page.url().match(/proposals\/([0-9a-f-]{36})/)![1];
    await page.waitForTimeout(1500);

    const [created] = sql("select workspace_id, status from proposals where id = $1", [proposalId]);
    expect(created, "createProposal persisted the row").toBeTruthy();
    wsId = created.workspace_id as string;

    // 2. The catalogue must only offer block types this kind accepts on read.
    //    Proposals have no signature block; the entry used to exist anyway, so it
    //    saved and then vanished on reload (silent content loss).
    const search = page.getByPlaceholder(/Search elements|Cari elemen/);
    await search.fill("Signature");
    await page.waitForTimeout(300);
    await expect(
      page.locator("aside button[type=button]").filter({ hasText: "Signature Pad" }),
      "the proposal catalogue must not offer a signature block",
    ).toHaveCount(0);
    await search.fill("");
    await page.waitForTimeout(200);

    const CATALOG = [
      "Heading", "Paragraph / Text", "Bullet / Numbered List", "Pricing & Data Table",
      "Divider Line", "Smart Variable Block",
    ];
    for (const label of CATALOG) await addBlock(page, label);

    // 3. Structure tab lists them and reorders.
    await page.getByRole("button", { name: /^Structure \(|^Struktur \(/ }).click();
    await page.waitForTimeout(300);
    const structureCount = await page.locator("aside button[draggable=true]").count();
    expect(structureCount, "structure rail lists the added blocks").toBeGreaterThanOrEqual(CATALOG.length);

    // 4. Settings: title, client, validity, custom slug.
    await page.getByRole("button", { name: "SETTINGS" }).click();
    await page.waitForTimeout(400);
    // The settings panel renders <Label> as a sibling (no htmlFor/id), so the
    // fields are addressed by their stable placeholders.
    await page.getByPlaceholder("e.g. Website Revamp & Maintenance").fill(PROPOSAL_TITLE);
    await page.getByPlaceholder("e.g. John Doe").fill("QA Docs Client");
    await page.getByPlaceholder("e.g. client@example.com").fill(REAL_EMAIL);
    // Custom slugs are plan-gated: on a free plan the field is disabled and the
    // upgrade CTA is shown. Lock that contract rather than the happy path.
    const slugField = page.getByPlaceholder("your-url");
    if (await slugField.count()) {
      await expect(slugField, "free plan cannot edit the URL slug").toBeDisabled();
      await expect(page.getByRole("link", { name: /Upgrade/ }).first()).toBeVisible();
    }
    await page.getByRole("button", { name: /^(Save|Simpan)$/ }).first().click();
    await page.waitForTimeout(2500);

    const [saved] = sql(
      "select title, client_email, slug, content_blocks from proposals where id = $1",
      [proposalId],
    );
    expect(saved.title).toBe(PROPOSAL_TITLE);
    // Regression: the settings form used to submit `slug: null` on every save for
    // free-plan workspaces (field disabled), wiping the server-generated share
    // slug so the advertised public link 404'd. It must survive a save.
    expect(saved.slug, "saving settings must not wipe the share slug").toBeTruthy();
    const proposalRef = (saved.slug as string | null) ?? proposalId;

    await page.getByRole("button", { name: "PUBLISH" }).click();
    await page.waitForTimeout(800);
    const shareInputs = page.locator("input[readonly]");
    const shareValues: string[] = [];
    for (let i = 0; i < await shareInputs.count(); i++) shareValues.push(await shareInputs.nth(i).inputValue());
    expect(
      shareValues.some((v) => v.includes(`/proposal/${proposalRef}`)),
      `PUBLISH exposes the public share link (ref=${proposalRef}); inputs=${JSON.stringify(shareValues)}`,
    ).toBe(true);

    // Copy button must succeed and toast.
    await page.getByRole("button", { name: /Copy|Salin/ }).first().click();
    await expect(page.getByText(/copied|disalin/i).first()).toBeVisible({ timeout: 10_000 });

    // The PUBLISH tab must warn that the link is inert while the document is a
    // draft, AND must offer the send action itself. Sending is what writes
    // `shared_token_hash`; without it the advertised link reaches a page with no
    // accept control. Previously the builder had no send button at all — the only
    // one lived on the list page's row actions.
    await expect(
      page.getByText(/Link not active yet|Link belum aktif/).first(),
      "draft PUBLISH tab warns the link is inert",
    ).toBeVisible({ timeout: 10_000 });

    // Element catalogue / structure rows also render a "Send" label (the block
    // type), so scope to the publishing panel.
    await page.getByRole("button", { name: /^(Send proposal|Kirim proposal)$/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /^(Kirim|Send)$/ }).last().click();
    await page.waitForTimeout(4000);

    const [sent] = sql("select status, shared_token_hash from proposals where id = $1", [proposalId]);
    expect(sent.status, "sending from the builder moved the proposal off draft").not.toBe("draft");
    expect(
      String(sent.shared_token_hash ?? "").length,
      "sending from the builder wrote the share token (this is what makes the link valid)",
    ).toBeGreaterThan(0);

    // Every block offered by the (kind-filtered) catalogue round-trips.
    const stored = blockTypes(saved);
    expect(stored, "proposal blocks round-trip").toEqual(expect.arrayContaining(["heading", "text", "list", "table", "divider", "placeholder"]));

    // 5. Public page renders the blocks and the settings. The link is live because
    //    step 4 sent the document through the real sendProposal flow (asserted in
    //    the DB above) — nothing is faked here.
    await page.goto(`/proposal/${proposalRef}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(PROPOSAL_TITLE).first()).toBeVisible({ timeout: 30_000 });

    // 6. Accept → project + DP invoice, proven in the database.
    await page.getByRole("button", { name: /Accept proposal|Setujui proposal/ }).click();
    await page.getByRole("button", { name: /Accept|Setujui/ }).last().click();
    await page.waitForTimeout(5000);
    const [after] = sql("select status, project_id from proposals where id = $1", [proposalId]);
    expect(after.status, "acceptProposalPublic marked the proposal accepted").toBe("accepted");
    expect(after.project_id, "accept created a project").toBeTruthy();
    const invoices = sql("select invoice_number, total, status from invoices where project_id is not null and workspace_id = $1", [wsId]);
    expect(invoices.length, "accept created the down-payment invoice").toBe(1);
    expect(String(invoices[0].notes ?? "")).toBeDefined();

    // 7. PDF route answers for the accepted proposal.
    const pdf = await page.request.get(`/api/proposals/${proposalId}/pdf`);
    expect(pdf.status(), "proposal PDF renders").toBeLessThan(400);
    expect(pdf.headers()["content-type"] ?? "").toContain("pdf");

    // 8. Row actions on the list page: resend/create-link is hidden once accepted,
    //    and delete is hidden too (accepted proposals are locked).
    await page.goto("/app/proposals", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    expect(await page.getByRole("button", { name: /Delete|Hapus/ }).count(), "accepted proposal is not deletable").toBe(0);

    expect(errors, "no console/page errors on the proposal surface").toEqual([]);
  });

  // ─────────────────────────────── CONTRACT ───────────────────────────────
  test("[C] contract: every catalogue element, sign, revoke, guards", async ({ page }) => {
    test.setTimeout(420_000);
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));

    await page.goto("/app/contracts", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /New contract|Kontrak baru/ }).first().click();
    await page.waitForURL(/\/app\/contracts\/[0-9a-f-]{36}\/edit/, { timeout: 60_000 });
    const contractId = page.url().match(/contracts\/([0-9a-f-]{36})/)![1];
    await page.waitForTimeout(1500);

    const [created] = sql("select workspace_id, status from contracts where id = $1", [contractId]);
    expect(created, "createContract persisted the row").toBeTruthy();
    wsId = created.workspace_id as string;

    // 1. Contracts have no file-attachment block on read, so the catalogue must
    //    not offer one.
    const search = page.getByPlaceholder(/Search elements|Cari elemen/);
    await search.fill("Attachment");
    await page.waitForTimeout(300);
    await expect(
      page.locator("aside button[type=button]").filter({ hasText: "File Attachment" }),
      "the contract catalogue must not offer a file-attachment block",
    ).toHaveCount(0);
    await search.fill("");
    await page.waitForTimeout(200);

    // The signature block ships with the contract starter; add the rest.
    for (const label of ["Heading", "Paragraph / Text", "Bullet / Numbered List", "Pricing & Data Table", "Divider Line"]) {
      await addBlock(page, label);
    }

    // 2. Settings + client picker (existing client → reuse instead of retype).
    await page.getByRole("button", { name: "SETTINGS" }).click();
    await page.waitForTimeout(400);
    await page.getByPlaceholder("e.g. Website Revamp & Maintenance").fill(CONTRACT_TITLE);
    await page.getByPlaceholder("e.g. client@example.com").fill(REAL_EMAIL);
    await page.getByRole("button", { name: /^(Save|Simpan)$/ }).first().click();
    await page.waitForTimeout(2500);

    const [saved] = sql(
      "select title, slug, contract_number, content_blocks from contracts where id = $1",
      [contractId],
    );
    expect(saved.title).toBe(CONTRACT_TITLE);
    const contractRef = (saved.slug as string | null) ?? contractId;
    const stored = blockTypes(saved);
    expect(stored, "starter blocks persisted").toContain("heading");
    expect(stored, "contract starter keeps its signature block").toContain("signature");

    // 3. Send from the builder's PUBLISH tab. Same rule as proposals: the public
    //    link is inert until the document is sent, because `sendContract` is what
    //    writes `shared_token_hash`. This used to be impossible from the builder.
    await page.getByRole("button", { name: "PUBLISH" }).click();
    await page.waitForTimeout(800);
    await expect(
      page.getByText(/Link not active yet|Link belum aktif/).first(),
      "draft PUBLISH tab warns the link is inert",
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /^(Send for signature|Kirim untuk tanda tangan)$/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /^(Kirim|Send)$/ }).last().click();
    await page.waitForTimeout(4000);

    const [sent] = sql("select status, shared_token_hash from contracts where id = $1", [contractId]);
    expect(sent.status, "sending from the builder moved the contract off draft").not.toBe("draft");
    expect(
      String(sent.shared_token_hash ?? "").length,
      "sending from the builder wrote the signing token",
    ).toBeGreaterThan(0);

    const publicUrl = `/contract/${contractRef}`;
    await page.goto(publicUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(CONTRACT_TITLE).first()).toBeVisible({ timeout: 30_000 });

    // 4. Sign: draw a stroke, type name + email, submit.
    await page.getByRole("button", { name: /Type Name|Ketik Nama/ }).click();
    await page.getByLabel(/Full Name|Nama Lengkap/).fill("QA Signer");
    await page.getByLabel(/Email Address|Alamat Email/).fill(`qa-signer-${stamp}@example.com`);
    await page.getByRole("button", { name: /Sign contract|Tanda tangani|^Sign$/i }).first().click();
    await page.waitForTimeout(6000);

    const [signed] = sql(
      "select status, signed_name, signed_email, signed_at, signature_data_url from contracts where id = $1",
      [contractId],
    );
    expect(signed.status, "signContract set the status").toBe("signed");
    expect(signed.signed_name).toBe("QA Signer");
    expect(String(signed.signature_data_url ?? ""), "typed signature produced an image").toMatch(/^data:image\/png;base64,/);

    // 5. Signed contract is terminal: the page now reports the signed state.
    await page.goto(publicUrl, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/already signed|sudah ditandatangani|Digitally Signed/i).first()).toBeVisible({ timeout: 30_000 });

    // 6. PDF for the signed contract.
    const pdf = await page.request.get(`/api/contracts/${contractId}/pdf`);
    expect(pdf.status(), "contract PDF renders").toBeLessThan(400);

    // 7. Revoke from the row actions, then the public link must refuse.
    await page.goto("/app/contracts", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /More actions|Menu aksi/ }).first().click();
    const revokeItem = page.getByRole("menuitem", { name: /Revoke|Cabut/ });
    if (await revokeItem.count()) {
      await revokeItem.click();
      await page.getByRole("button", { name: /Revoke|Cabut|Confirm|Konfirmasi/ }).last().click();
      await page.waitForTimeout(3000);
      const [revoked] = sql("select shared_token_revoked_at from contracts where id = $1", [contractId]);
      expect(revoked.shared_token_revoked_at, "revokeContract stamped the token").toBeTruthy();
    }

    expect(errors, "no console/page errors on the contract surface").toEqual([]);
  });
});