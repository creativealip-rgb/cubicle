#!/usr/bin/env node
import assert from "node:assert/strict";
import process from "node:process";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import {
  assertHistoricalTimeEntryMutable,
  assertProjectTimeTrackingEnabled,
  getProjectTimeTrackingMode,
} from "../src/lib/project-time-tracking-policy-db";

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedDatabase = process.env.EXPECTED_DATABASE?.trim() || "cubicle_phase1_it";
const prefix = process.env.FIXTURE_PREFIX?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!prefix) throw new Error("FIXTURE_PREFIX is required");
const targetDatabase = new URL(databaseUrl).pathname.replace(/^\//, "");
if (targetDatabase !== expectedDatabase) {
  throw new Error(`Refusing integration test: expected ${expectedDatabase}, got ${targetDatabase || "<empty>"}`);
}
if (!/^cubicle_phase1_it(?:_[A-Za-z0-9_]+)?$/.test(targetDatabase) || targetDatabase === "cubicle") {
  throw new Error(`Refusing unsafe database ${targetDatabase}`);
}

const pool = new Pool({ connectionString: databaseUrl, max: 4 });
const database = drizzle(pool, { schema });
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
  const fixtureRows = await pool.query<{
    id: string;
    workspace_id: string;
    client_id: string;
    name: string;
    time_tracking_mode: string;
    activity_required: boolean;
  }>(
    `SELECT id, workspace_id, client_id, name, time_tracking_mode, activity_required
     FROM projects WHERE name LIKE $1 ORDER BY name`,
    [`${prefix}-%`],
  );
  assert.equal(fixtureRows.rowCount, 4);
  const bySuffix = Object.fromEntries(
    fixtureRows.rows.map((row) => [row.name.slice(prefix.length + 1), row]),
  );

  assert.equal(bySuffix.fixed.time_tracking_mode, "internal");
  assert.equal(bySuffix.hours.time_tracking_mode, "billable");
  assert.equal(bySuffix["package-hours"].time_tracking_mode, "billable");
  assert.equal(bySuffix["package-zero"].time_tracking_mode, "internal");
  assert.ok(fixtureRows.rows.every((row) => row.activity_required === false));
  pass("deterministic legacy backfill covers fixed, hours, and package allowance classes");

  const columns = await pool.query<{
    column_name: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT column_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name='projects'
       AND column_name IN ('time_tracking_mode','activity_required')
     ORDER BY column_name`,
  );
  assert.deepEqual(columns.rows.map((row) => row.column_name), ["activity_required", "time_tracking_mode"]);
  assert.ok(columns.rows.every((row) => row.is_nullable === "NO"));
  assert.match(columns.rows.find((row) => row.column_name === "activity_required")?.column_default || "", /false/);
  assert.match(columns.rows.find((row) => row.column_name === "time_tracking_mode")?.column_default || "", /internal/);
  pass("new policy columns are non-null with safe defaults");

  const constraint = await pool.query<{ definition: string }>(
    `SELECT pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conname='projects_time_tracking_mode_check' AND conrelid='projects'::regclass`,
  );
  assert.equal(constraint.rowCount, 1);
  assert.match(constraint.rows[0].definition, /off/);
  assert.match(constraint.rows[0].definition, /internal/);
  assert.match(constraint.rows[0].definition, /billable/);
  pass("time tracking mode check constraint installed");

  const template = bySuffix.fixed;
  const insertedDefault = await pool.query<{ id: string; time_tracking_mode: string; activity_required: boolean }>(
    `INSERT INTO projects (workspace_id, client_id, name, billing_type, currency, client_visible)
     VALUES ($1,$2,$3,'project','IDR',false)
     RETURNING id, time_tracking_mode, activity_required`,
    [template.workspace_id, template.client_id, `${prefix}-default`],
  );
  assert.deepEqual(
    {
      timeTrackingMode: insertedDefault.rows[0].time_tracking_mode,
      activityRequired: insertedDefault.rows[0].activity_required,
    },
    { timeTrackingMode: "internal", activityRequired: false },
  );
  pass("direct insert receives conservative internal defaults");

  await expectReject(
    "invalid tracking mode rejected by database",
    () => pool.query(
      `INSERT INTO projects
       (workspace_id, client_id, name, billing_type, time_tracking_mode, activity_required, currency, client_visible)
       VALUES ($1,$2,$3,'project','invalid',false,'IDR',false)`,
      [template.workspace_id, template.client_id, `${prefix}-invalid`],
    ),
    /projects_time_tracking_mode_check/,
  );

  assert.equal(
    await getProjectTimeTrackingMode(database, template.workspace_id, bySuffix.hours.id),
    "billable",
  );
  assert.equal(
    await assertProjectTimeTrackingEnabled(database, template.workspace_id, bySuffix.fixed.id),
    "internal",
  );
  pass("database policy resolver returns stored internal and billable modes");

  const historicalId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO time_entries
       (id, workspace_id, client_id, project_id, user_id, description, start_time, end_time,
        manual_minutes, billable, status)
     VALUES ($1,$2,$3,$4,$5,'Historical preserved',now() - interval '30 minutes',now(),30,true,'approved')`,
    [historicalId, template.workspace_id, template.client_id, bySuffix.hours.id, `${prefix}-user`],
  );
  await pool.query(
    "UPDATE projects SET time_tracking_mode='off', activity_required=false WHERE id=$1",
    [bySuffix.hours.id],
  );
  await expectReject(
    "off project rejects new time through database policy resolver",
    () => assertProjectTimeTrackingEnabled(database, template.workspace_id, bySuffix.hours.id),
    /Pelacakan waktu dinonaktifkan/,
  );
  await expectReject(
    "off project historical entry becomes read-only",
    () => assertHistoricalTimeEntryMutable(database, template.workspace_id, bySuffix.hours.id),
    /hanya dapat dibaca/,
  );
  const historical = await pool.query<{
    description: string;
    duration_minutes: number;
    billable: boolean;
    status: string;
  }>(
    "SELECT description, duration_minutes, billable, status FROM time_entries WHERE id=$1",
    [historicalId],
  );
  assert.deepEqual(historical.rows[0], {
    description: "Historical preserved",
    duration_minutes: 30,
    billable: true,
    status: "approved",
  });
  pass("changing project mode to off preserves historical time row values");

  console.log(`database=${targetDatabase}`);
  for (const result of results) console.log(result);
  console.log(`PASS\t${results.length} Phase 1 behavioral DB checks`);
} finally {
  await pool.end();
}
