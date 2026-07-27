#!/usr/bin/env node
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { assertTimeEntryContext } from "../src/lib/time-entry-context";

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedDatabase = process.env.EXPECTED_DATABASE?.trim() || "cubicle_phase0a_it";
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const targetDatabase = new URL(databaseUrl).pathname.replace(/^\//, "");
if (targetDatabase !== expectedDatabase) {
  throw new Error(`Refusing integration test: expected ${expectedDatabase}, got ${targetDatabase || "<empty>"}`);
}
if (targetDatabase === "cubicle") throw new Error("Refusing production database");

const pool = new Pool({ connectionString: databaseUrl, max: 8 });
const database = drizzle(pool, { schema });
const prefix = randomUUID().slice(0, 8);
const ids = {
  userA: `phase0a-user-a-${prefix}`,
  userB: `phase0a-user-b-${prefix}`,
  workspaceA: randomUUID(),
  workspaceB: randomUUID(),
  clientA: randomUUID(),
  clientB: randomUUID(),
  projectA: randomUUID(),
  projectB: randomUUID(),
  taskA: randomUUID(),
  taskB: randomUUID(),
  invoiceA: randomUUID(),
  packageA: randomUUID(),
};

const results: string[] = [];
const pass = (name: string) => results.push(`PASS\t${name}`);

async function expectReject(name: string, operation: () => Promise<unknown>, message: RegExp) {
  try {
    await operation();
    assert.fail(`${name}: expected rejection`);
  } catch (error) {
    assert.match(error instanceof Error ? error.message : String(error), message);
    pass(name);
  }
}

try {
  await pool.query("BEGIN");
  await pool.query(
    `INSERT INTO users (id, name, email, email_verified, plan)
     VALUES ($1, 'Phase0A User A', $2, true, 'team'), ($3, 'Phase0A User B', $4, true, 'team')`,
    [ids.userA, `${ids.userA}@example.test`, ids.userB, `${ids.userB}@example.test`],
  );
  await pool.query(
    `INSERT INTO workspaces (id, name, slug, owner_id, default_currency)
     VALUES ($1, 'Phase0A Workspace A', $2, $3, 'IDR'), ($4, 'Phase0A Workspace B', $5, $6, 'IDR')`,
    [ids.workspaceA, `phase0a-a-${prefix}`, ids.userA, ids.workspaceB, `phase0a-b-${prefix}`, ids.userB],
  );
  await pool.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, 'owner'), ($3, $4, 'owner')`,
    [ids.workspaceA, ids.userA, ids.workspaceB, ids.userB],
  );
  await pool.query(
    `INSERT INTO clients (id, workspace_id, name)
     VALUES ($1, $2, 'Phase0A Client A'), ($3, $4, 'Phase0A Client B')`,
    [ids.clientA, ids.workspaceA, ids.clientB, ids.workspaceB],
  );
  await pool.query(
    `INSERT INTO projects (id, workspace_id, client_id, name, billing_type, currency, client_visible)
     VALUES ($1, $2, $3, 'Phase0A Project A', 'hours', 'IDR', true),
            ($4, $5, $6, 'Phase0A Project B', 'hours', 'IDR', true)`,
    [ids.projectA, ids.workspaceA, ids.clientA, ids.projectB, ids.workspaceB, ids.clientB],
  );
  await pool.query(
    `INSERT INTO tasks (id, workspace_id, project_id, title)
     VALUES ($1, $2, $3, 'Phase0A Task A'), ($4, $5, $6, 'Phase0A Task B')`,
    [ids.taskA, ids.workspaceA, ids.projectA, ids.taskB, ids.workspaceB, ids.projectB],
  );
  await pool.query("COMMIT");

  await assertTimeEntryContext(database, ids.workspaceA, {
    clientId: ids.clientA,
    projectId: ids.projectA,
    taskId: ids.taskA,
  });
  pass("same-workspace time context accepted");

  await expectReject(
    "cross-workspace client rejected",
    () => assertTimeEntryContext(database, ids.workspaceA, { clientId: ids.clientB }),
    /Client tidak berada di workspace aktif/,
  );
  await expectReject(
    "cross-workspace project rejected",
    () => assertTimeEntryContext(database, ids.workspaceA, {
      clientId: ids.clientA,
      projectId: ids.projectB,
    }),
    /Project tidak sesuai dengan Client\/workspace/,
  );
  await expectReject(
    "cross-project task rejected",
    () => assertTimeEntryContext(database, ids.workspaceA, {
      clientId: ids.clientA,
      projectId: ids.projectA,
      taskId: ids.taskB,
    }),
    /Task tidak sesuai dengan Project\/workspace/,
  );

  const timerId = randomUUID();
  await pool.query(
    `INSERT INTO time_entries
       (id, workspace_id, client_id, project_id, task_id, user_id, description, start_time, end_time, manual_minutes, billable, hourly_rate, status)
     VALUES ($1,$2,$3,$4,$5,$6,'Owned timer',now(),now() + interval '5 minutes',null,true,100000,'draft')`,
    [timerId, ids.workspaceA, ids.clientA, ids.projectA, ids.taskA, ids.userA],
  );
  const ownerMatch = await pool.query(
    `SELECT id FROM time_entries WHERE id=$1 AND workspace_id=$2 AND user_id=$3`,
    [timerId, ids.workspaceA, ids.userA],
  );
  const attackerMatch = await pool.query(
    `SELECT id FROM time_entries WHERE id=$1 AND workspace_id=$2 AND user_id=$3`,
    [timerId, ids.workspaceA, ids.userB],
  );
  assert.equal(ownerMatch.rowCount, 1);
  assert.equal(attackerMatch.rowCount, 0);
  pass("timer ownership selector denies another user");

  await pool.query("DELETE FROM time_entries WHERE id=$1", [timerId]);
  const concurrentInsert = `INSERT INTO time_entries
    (id, workspace_id, user_id, description, start_time, end_time, manual_minutes, billable, status)
    VALUES ($1,$2,$3,'Concurrent timer',now(),null,null,true,'draft')`;
  const concurrent = await Promise.allSettled([
    pool.query(concurrentInsert, [randomUUID(), ids.workspaceA, ids.userA]),
    pool.query(concurrentInsert, [randomUUID(), ids.workspaceA, ids.userA]),
  ]);
  assert.equal(concurrent.filter((item) => item.status === "fulfilled").length, 1);
  const rejected = concurrent.find((item) => item.status === "rejected");
  assert.ok(rejected && rejected.status === "rejected");
  assert.equal((rejected.reason as { code?: string }).code, "23505");
  const activeCount = await pool.query(
    `SELECT count(*)::int AS count FROM time_entries
     WHERE workspace_id=$1 AND user_id=$2 AND end_time IS NULL AND manual_minutes IS NULL`,
    [ids.workspaceA, ids.userA],
  );
  assert.equal(activeCount.rows[0].count, 1);
  pass("concurrent timer start leaves one active row");
  await pool.query(
    `DELETE FROM time_entries WHERE workspace_id=$1 AND user_id=$2 AND end_time IS NULL AND manual_minutes IS NULL`,
    [ids.workspaceA, ids.userA],
  );

  const validEntry = randomUUID();
  const draftEntry = randomUUID();
  const nonBillableEntry = randomUUID();
  const unfinishedEntry = randomUUID();
  await pool.query(
    `INSERT INTO time_entries
       (id, workspace_id, client_id, project_id, user_id, description, start_time, end_time, manual_minutes, billable, hourly_rate, status)
     VALUES
       ($1,$5,$6,$7,$8,'Eligible',now() - interval '2 hours',now(),null,true,200000,'approved'),
       ($2,$5,$6,$7,$8,'Draft',now() - interval '1 hour',now(),null,true,200000,'draft'),
       ($3,$5,$6,$7,$8,'Non billable',now() - interval '1 hour',now(),null,false,200000,'approved'),
       ($4,$5,$6,$7,$9,'Unfinished',now(),null,null,true,200000,'approved')`,
    [validEntry, draftEntry, nonBillableEntry, unfinishedEntry, ids.workspaceA, ids.clientA, ids.projectA, ids.userA, ids.userB],
  );
  await pool.query(
    `INSERT INTO invoices
       (id, workspace_id, client_id, project_id, invoice_number, issue_date, currency, status)
     VALUES ($1,$2,$3,$4,$5,current_date,'IDR','draft')`,
    [ids.invoiceA, ids.workspaceA, ids.clientA, ids.projectA, `PHASE0A-${prefix}`],
  );

  const candidates = [validEntry, draftEntry, nonBillableEntry, unfinishedEntry];
  const eligible = await pool.query(
    `SELECT id FROM time_entries
     WHERE id = ANY($1::uuid[])
       AND workspace_id=$2 AND client_id=$3 AND project_id=$4
       AND status='approved' AND billable=true AND end_time IS NOT NULL
       AND duration_minutes > 0 AND hourly_rate IS NOT NULL AND hourly_rate > 0`,
    [candidates, ids.workspaceA, ids.clientA, ids.projectA],
  );
  assert.deepEqual(eligible.rows.map((row) => row.id), [validEntry]);
  pass("invoice eligibility accepts approved billable completed entry only");

  await pool.query("BEGIN");
  await pool.query(
    `INSERT INTO invoice_items
       (invoice_id, description, quantity, unit_price, amount, source_type, source_id, previous_time_entry_status)
     VALUES ($1,'Eligible',2,200000,400000,'time_entry',$2,'approved')`,
    [ids.invoiceA, validEntry],
  );
  await pool.query(
    `UPDATE time_entries SET status='invoiced', updated_at=now()
     WHERE id=$1 AND status='approved'`,
    [validEntry],
  );
  await pool.query("COMMIT");

  await expectReject(
    "invoice time source idempotency rejects duplicate import",
    () => pool.query(
      `INSERT INTO invoice_items
         (invoice_id, description, quantity, unit_price, amount, source_type, source_id, previous_time_entry_status)
       VALUES ($1,'Duplicate',2,200000,400000,'time_entry',$2,'approved')`,
      [ids.invoiceA, validEntry],
    ),
    /duplicate key value violates unique constraint/,
  );
  const imported = await pool.query(
    `SELECT te.status, count(ii.id)::int AS links
     FROM time_entries te LEFT JOIN invoice_items ii
       ON ii.source_type='time_entry' AND ii.source_id=te.id
     WHERE te.id=$1 GROUP BY te.status`,
    [validEntry],
  );
  assert.deepEqual(imported.rows, [{ status: "invoiced", links: 1 }]);
  pass("invoice import persists one source link and invoiced status");

  await pool.query(
    `INSERT INTO packages (id, workspace_id, project_id, name, hours, price, currency, active)
     VALUES ($1,$2,$3,'Phase0A Package',10,1000000,'IDR',true)`,
    [ids.packageA, ids.workspaceA, ids.projectA],
  );
  const orderKey = randomUUID();
  const orderSql = `INSERT INTO package_orders
    (workspace_id, project_id, package_id, client_id, idempotency_key, package_name, hours, price, currency, status)
    VALUES ($1,$2,$3,$4,$5,'Phase0A Package',10,1000000,'IDR','pending')
    ON CONFLICT DO NOTHING RETURNING id`;
  const firstOrder = await pool.query(orderSql, [ids.workspaceA, ids.projectA, ids.packageA, ids.clientA, orderKey]);
  const secondOrder = await pool.query(orderSql, [ids.workspaceA, ids.projectA, ids.packageA, ids.clientA, orderKey]);
  assert.equal(firstOrder.rowCount, 1);
  assert.equal(secondOrder.rowCount, 0);
  const orderCount = await pool.query(
    `SELECT count(*)::int AS count FROM package_orders WHERE client_id=$1 AND idempotency_key=$2`,
    [ids.clientA, orderKey],
  );
  assert.equal(orderCount.rows[0].count, 1);
  pass("package order idempotency stores one authoritative snapshot");

  console.log(`database=${targetDatabase}`);
  for (const result of results) console.log(result);
  console.log(`PASS\t${results.length} behavioral DB checks`);
} finally {
  await pool.end();
}
