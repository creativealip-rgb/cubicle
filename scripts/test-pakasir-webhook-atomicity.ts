import pg from "pg";
import crypto from "node:crypto";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString: databaseUrl, max: 8 });

const paidAt = new Date("2026-07-25T00:00:00.000Z");
const expiresAt = new Date(paidAt.getTime() + 30 * 86400000);

async function seedPayment(label: string) {
  const suffix = crypto.randomBytes(5).toString("hex");
  const workspace = await pool.query(`SELECT id, owner_id FROM workspaces WHERE owner_id IS NOT NULL LIMIT 1`);
  if (!workspace.rows[0]) throw new Error("workspace fixture missing");
  const row = await pool.query(
    `INSERT INTO pakasir_payments (workspace_id, order_id, plan, amount, status)
     VALUES ($1, $2, 'solo', 49000, 'pending') RETURNING id, workspace_id, order_id`,
    [workspace.rows[0].id, `atomic-${label}-${suffix}`],
  );
  await pool.query(`UPDATE users SET plan='free', plan_expires_at=NULL WHERE id=$1`, [workspace.rows[0].owner_id]);
  return { ...row.rows[0], ownerId: workspace.rows[0].owner_id };
}

async function complete(payment: { id: string; order_id: string }, amount = 49000) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(`SELECT * FROM pakasir_payments WHERE id=$1 FOR UPDATE`, [payment.id]);
    const current = locked.rows[0];
    if (!current) { await client.query("ROLLBACK"); return "not_found"; }
    if (current.status === "completed") { await client.query("COMMIT"); return "idempotent"; }
    if (current.status !== "pending") { await client.query("COMMIT"); return "ignored"; }
    if (current.order_id !== payment.order_id || Math.round(Number(current.amount)) !== amount) {
      await client.query("ROLLBACK"); return "mismatch";
    }
    const workspace = await client.query(`SELECT owner_id FROM workspaces WHERE id=$1`, [current.workspace_id]);
    if (!workspace.rows[0]?.owner_id) throw new Error("owner missing");
    await client.query(`UPDATE users SET plan=$1, plan_expires_at=$2 WHERE id=$3`, [current.plan, expiresAt, workspace.rows[0].owner_id]);
    const done = await client.query(
      `UPDATE pakasir_payments SET status='completed', paid_at=$1, updated_at=now()
       WHERE id=$2 AND status='pending' RETURNING id`,
      [paidAt, current.id],
    );
    if (done.rowCount !== 1) throw new Error("conditional completion lost");
    await client.query("COMMIT");
    return "activated";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const concurrent = await seedPayment("concurrent");
  const results = await Promise.all([complete(concurrent), complete(concurrent)]);
  const state = await pool.query(
    `SELECT p.status, p.paid_at, u.plan, u.plan_expires_at
     FROM pakasir_payments p JOIN workspaces w ON w.id=p.workspace_id JOIN users u ON u.id=w.owner_id
     WHERE p.id=$1`, [concurrent.id],
  );
  if (results.filter((x) => x === "activated").length !== 1 || results.filter((x) => x === "idempotent").length !== 1) throw new Error(`bad concurrent results ${results}`);
  if (state.rows[0].status !== "completed" || state.rows[0].plan !== "solo") throw new Error("activation state invalid");
  const replay = await complete(concurrent);
  if (replay !== "idempotent") throw new Error("replay not idempotent");

  const mismatch = await seedPayment("mismatch");
  const mismatchResult = await complete(mismatch, 1);
  const mismatchState = await pool.query(`SELECT p.status, u.plan FROM pakasir_payments p JOIN workspaces w ON w.id=p.workspace_id JOIN users u ON u.id=w.owner_id WHERE p.id=$1`, [mismatch.id]);
  if (mismatchResult !== "mismatch" || mismatchState.rows[0].status !== "pending" || mismatchState.rows[0].plan !== "free") throw new Error("mismatch mutated state");

  const rollback = await seedPayment("rollback");
  let failed = false;
  try { await complete(rollback); } catch { failed = true; }
  const rollbackState = await pool.query(`SELECT p.status, p.paid_at, u.plan, u.plan_expires_at FROM pakasir_payments p JOIN workspaces w ON w.id=p.workspace_id JOIN users u ON u.id=w.owner_id WHERE p.id=$1`, [rollback.id]);
  if (!failed || rollbackState.rows[0].status !== "pending" || rollbackState.rows[0].paid_at !== null || rollbackState.rows[0].plan !== "free" || rollbackState.rows[0].plan_expires_at !== null) throw new Error("rollback invariant failed");

  console.log(JSON.stringify({ concurrent: results.sort(), replay, mismatch: mismatchResult, rollback: "all_state_reverted" }));
}

main().finally(() => pool.end());
