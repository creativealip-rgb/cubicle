import * as crypto from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { assertDisposableDatabaseUrl } from "./invoice-concurrency-safety";
const databaseUrl = assertDisposableDatabaseUrl(process.env.DATABASE_URL).toString();
const pool = new Pool({ connectionString: databaseUrl, max: 6 });
const schema = `invoice_concurrency_${crypto.randomBytes(8).toString("hex")}`;
const qSchema = `"${schema}"`;
const workspaceId = crypto.randomUUID();
const clientId = crypto.randomUUID();
const hourlyProjectId = crypto.randomUUID();
const fixedProjectId = crypto.randomUUID();
const timeEntryId = crypto.randomUUID();
const agreedAmount = 100_000;

async function inFixtureTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL search_path TO ${qSchema}, pg_catalog`);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function setupFixture() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA ${qSchema}`);
    await client.query(`
      CREATE TABLE ${qSchema}.projects (
        id uuid PRIMARY KEY,
        workspace_id uuid NOT NULL,
        client_id uuid NOT NULL,
        agreed_amount numeric(14,2) NOT NULL
      );
      CREATE TABLE ${qSchema}.time_entries (
        id uuid PRIMARY KEY,
        workspace_id uuid NOT NULL,
        client_id uuid NOT NULL,
        project_id uuid NOT NULL,
        status text NOT NULL,
        billable boolean NOT NULL,
        duration_minutes integer NOT NULL,
        hourly_rate numeric(14,2) NOT NULL,
        end_time timestamptz
      );
      CREATE TABLE ${qSchema}.invoices (
        id uuid PRIMARY KEY,
        workspace_id uuid NOT NULL,
        client_id uuid NOT NULL,
        project_id uuid NOT NULL,
        status text NOT NULL
      );
      CREATE TABLE ${qSchema}.invoice_items (
        id uuid PRIMARY KEY,
        invoice_id uuid NOT NULL REFERENCES ${qSchema}.invoices(id) ON DELETE CASCADE,
        source_type text NOT NULL,
        source_id uuid,
        source_mode text NOT NULL,
        original_amount numeric(14,2),
        previous_time_entry_status text
      );
      CREATE UNIQUE INDEX invoice_items_time_entry_source_uidx
        ON ${qSchema}.invoice_items (source_id)
        WHERE source_type = 'time_entry' AND source_id IS NOT NULL;
    `);
    await client.query(
      `INSERT INTO ${qSchema}.projects (id, workspace_id, client_id, agreed_amount)
       VALUES ($1, $2, $3, 0), ($4, $2, $3, $5)`,
      [hourlyProjectId, workspaceId, clientId, fixedProjectId, agreedAmount],
    );
    await client.query(
      `INSERT INTO ${qSchema}.time_entries
        (id, workspace_id, client_id, project_id, status, billable, duration_minutes, hourly_rate, end_time)
       VALUES ($1, $2, $3, $4, 'approved', true, 60, 50000, now())`,
      [timeEntryId, workspaceId, clientId, hourlyProjectId],
    );
  } finally {
    client.release();
  }
}

async function claimHourlySource(label: string): Promise<string> {
  return inFixtureTransaction(async (client) => {
    // Same invariant order as createInvoice: per-project advisory lock, then eligible row FOR UPDATE.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`invoice-source:${workspaceId}:${hourlyProjectId}`]);
    const entry = await client.query(
      `SELECT id FROM time_entries
       WHERE id = $1 AND workspace_id = $2 AND client_id = $3 AND project_id = $4
         AND billable = true AND status = 'approved' AND end_time IS NOT NULL
         AND duration_minutes > 0 AND hourly_rate > 0
       FOR UPDATE`,
      [timeEntryId, workspaceId, clientId, hourlyProjectId],
    );
    if (entry.rowCount !== 1) throw new Error(`${label}: hourly source no longer eligible`);

    const invoiceId = crypto.randomUUID();
    await client.query(
      `INSERT INTO invoices (id, workspace_id, client_id, project_id, status)
       VALUES ($1, $2, $3, $4, 'draft')`,
      [invoiceId, workspaceId, clientId, hourlyProjectId],
    );
    await client.query(
      `INSERT INTO invoice_items
        (id, invoice_id, source_type, source_id, source_mode, previous_time_entry_status)
       VALUES ($1, $2, 'time_entry', $3, 'hourly_timesheet', 'approved')`,
      [crypto.randomUUID(), invoiceId, timeEntryId],
    );
    const transitioned = await client.query(
      `UPDATE time_entries SET status = 'invoiced'
       WHERE id = $1 AND status = 'approved' RETURNING id`,
      [timeEntryId],
    );
    if (transitioned.rowCount !== 1) throw new Error(`${label}: conditional status transition lost`);
    return invoiceId;
  });
}

async function calculateFixedFinal(): Promise<number> {
  return inFixtureTransaction(async (client) => {
    // Same createInvoice invariant: serialize by project and recalculate active total under lock.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`invoice-source:${workspaceId}:${fixedProjectId}`]);
    const project = await client.query(
      `SELECT agreed_amount FROM projects
       WHERE id = $1 AND workspace_id = $2 AND client_id = $3`,
      [fixedProjectId, workspaceId, clientId],
    );
    if (project.rowCount !== 1) throw new Error("fixed project missing");
    const prior = await client.query(
      `SELECT COALESCE(SUM(ii.original_amount), 0)::numeric AS total
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       WHERE ii.source_type = 'project' AND ii.source_id = $1
         AND i.workspace_id = $2
         AND i.status IN ('draft', 'sent', 'viewed', 'paid', 'overdue')
         AND ii.source_mode IN ('fixed_full', 'fixed_dp', 'fixed_milestone', 'fixed_final')`,
      [fixedProjectId, workspaceId],
    );
    const remaining = Math.max(0, Number(project.rows[0].agreed_amount) - Number(prior.rows[0].total));
    if (remaining === 0) return 0;

    const invoiceId = crypto.randomUUID();
    await client.query(
      `INSERT INTO invoices (id, workspace_id, client_id, project_id, status)
       VALUES ($1, $2, $3, $4, 'draft')`,
      [invoiceId, workspaceId, clientId, fixedProjectId],
    );
    await client.query(
      `INSERT INTO invoice_items
        (id, invoice_id, source_type, source_id, source_mode, original_amount)
       VALUES ($1, $2, 'project', $3, 'fixed_final', $4)`,
      [crypto.randomUUID(), invoiceId, fixedProjectId, remaining],
    );
    return remaining;
  });
}

async function main() {
  await setupFixture();

  const hourly = await Promise.allSettled([
    claimHourlySource("claim-a"),
    claimHourlySource("claim-b"),
  ]);
  const fixed = await Promise.all([calculateFixedFinal(), calculateFixedFinal()]);

  const state = await inFixtureTransaction(async (client) => {
    const hourlyState = await client.query(
      `SELECT
         (SELECT count(*)::int FROM invoice_items WHERE source_type = 'time_entry' AND source_id = $1) AS links,
         (SELECT status FROM time_entries WHERE id = $1) AS status`,
      [timeEntryId],
    );
    const fixedState = await client.query(
      `SELECT COALESCE(SUM(ii.original_amount), 0)::numeric AS active_total
       FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
       WHERE ii.source_type = 'project' AND ii.source_id = $1
         AND i.status IN ('draft', 'sent', 'viewed', 'paid', 'overdue')
         AND ii.source_mode IN ('fixed_full', 'fixed_dp', 'fixed_milestone', 'fixed_final')`,
      [fixedProjectId],
    );
    return { hourly: hourlyState.rows[0], fixedActiveTotal: Number(fixedState.rows[0].active_total) };
  });

  const hourlySuccesses = hourly.filter((result) => result.status === "fulfilled").length;
  const hourlyFailures = hourly.filter((result) => result.status === "rejected").length;
  if (hourlySuccesses !== 1 || hourlyFailures !== 1) throw new Error(`expected one Hourly claim only: ${JSON.stringify(hourly)}`);
  if (state.hourly.links !== 1 || state.hourly.status !== "invoiced") throw new Error(`Hourly invariant failed: ${JSON.stringify(state.hourly)}`);
  if (state.fixedActiveTotal > agreedAmount) throw new Error(`Fixed active total ${state.fixedActiveTotal} exceeds agreed ${agreedAmount}`);
  if (fixed.reduce((sum, amount) => sum + amount, 0) !== state.fixedActiveTotal) throw new Error(`Fixed result mismatch: ${JSON.stringify({ fixed, state })}`);

  console.log(JSON.stringify({ hourly: { successes: hourlySuccesses, failures: hourlyFailures, ...state.hourly }, fixed: { calculations: fixed, activeTotal: state.fixedActiveTotal, agreedAmount } }));
}

main()
  .finally(async () => {
    const client = await pool.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${qSchema} CASCADE`);
    } finally {
      client.release();
      await pool.end();
    }
  });
