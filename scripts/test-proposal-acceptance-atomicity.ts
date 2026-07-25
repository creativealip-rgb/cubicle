import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: databaseUrl });
const title = `atomicity-${crypto.randomUUID()}`;
const rollbackTitle = `rollback-${crypto.randomUUID()}`;
async function seedProposal(name: string) {
  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const fixture = await pool.query(`
    SELECT w.id AS workspace_id, c.id AS client_id
    FROM workspaces w
    JOIN clients c ON c.workspace_id = w.id
    ORDER BY w.created_at
    LIMIT 1
  `);
  if (!fixture.rows[0]) throw new Error("workspace/client fixture missing");
  const { workspace_id, client_id } = fixture.rows[0];
  const inserted = await pool.query(`
    INSERT INTO proposals (
      workspace_id, client_id, title, line_items, subtotal, tax, total,
      currency, down_payment_percent, status, shared_token_hash,
      shared_token_expires_at, sent_at
    ) VALUES ($1, $2, $3, '[]'::jsonb, 100000, 0, 100000,
      'IDR', 50, 'sent', $4, NOW() + INTERVAL '1 day', NOW())
    RETURNING id, workspace_id
  `, [workspace_id, client_id, name, tokenHash]);
  return { ...(inserted.rows[0] as { id: string; workspace_id: string }), token };
}

async function counts(proposalId: string, name: string) {
  const result = await pool.query(`
    SELECT
      (SELECT status FROM proposals WHERE id = $1) AS status,
      (SELECT project_id FROM proposals WHERE id = $1) AS project_id,
      (SELECT count(*)::int FROM projects WHERE name = $2) AS projects,
      (SELECT count(*)::int FROM invoices WHERE notes LIKE '%' || $2) AS invoices,
      (SELECT count(*)::int FROM invoice_items WHERE description LIKE '%' || $2) AS items
  `, [proposalId, name]);
  return result.rows[0];
}

async function main() {
  const { acceptProposalPublic } = await import("../src/lib/actions/proposals");

  const concurrent = await seedProposal(title);
  const results = await Promise.all([
    acceptProposalPublic(concurrent.id, concurrent.token),
    acceptProposalPublic(concurrent.id, concurrent.token),
  ]);
  const afterConcurrent = await counts(concurrent.id, title);
  if (afterConcurrent.status !== "accepted" || afterConcurrent.projects !== 1 || afterConcurrent.invoices !== 1 || afterConcurrent.items !== 1) {
    throw new Error(`concurrency invariant failed: ${JSON.stringify(afterConcurrent)}`);
  }
  if (!results.some((result) => "alreadyAccepted" in result && result.alreadyAccepted)) {
    throw new Error(`replay result missing: ${JSON.stringify(results)}`);
  }

  const rollback = await seedProposal(rollbackTitle);
  let failed = false;
  try {
    await acceptProposalPublic(rollback.id, rollback.token);
  } catch {
    failed = true;
  }
  if (!failed) throw new Error("forced failure was not propagated");
  const afterRollback = await counts(rollback.id, rollbackTitle);
  if (afterRollback.status !== "sent" || afterRollback.project_id !== null || afterRollback.projects !== 0 || afterRollback.invoices !== 0 || afterRollback.items !== 0) {
    throw new Error(`rollback invariant failed: ${JSON.stringify(afterRollback)}`);
  }

  console.log(JSON.stringify({ concurrent: afterConcurrent, replay: true, rollback: afterRollback }));
}

main().finally(async () => pool.end());
