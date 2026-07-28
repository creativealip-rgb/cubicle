#!/usr/bin/env node
import assert from "node:assert/strict";
import process from "node:process";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedDatabase = process.env.EXPECTED_DATABASE?.trim() || "cubicle_phase2_it";
const prefix = process.env.FIXTURE_PREFIX?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!prefix) throw new Error("FIXTURE_PREFIX is required");
const targetDatabase = new URL(databaseUrl).pathname.replace(/^\//, "");
if (targetDatabase !== expectedDatabase) {
  throw new Error(`Refusing integration test: expected ${expectedDatabase}, got ${targetDatabase || "<empty>"}`);
}
if (!/^cubicle_phase2_it(?:_[A-Za-z0-9_]+)?$/.test(targetDatabase) || targetDatabase === "cubicle") {
  throw new Error(`Refusing unsafe database ${targetDatabase}`);
}

const pool = new Pool({ connectionString: databaseUrl, max: 4 });
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
  const identity = await pool.query<{
    database_name: string;
    database_user: string;
    server_address: string | null;
    fixture_select: boolean;
  }>(
    `SELECT current_database() AS database_name,
            current_user AS database_user,
            inet_server_addr()::text AS server_address,
            has_table_privilege(current_user, 'phase2_fixture_ids', 'SELECT') AS fixture_select`,
  );
  console.log(`identity=${JSON.stringify(identity.rows[0])}`);

  const fixtures = await pool.query<{
    workspace_id: string;
    other_workspace_id: string;
    project_id: string;
    second_project_id: string;
    other_project_id: string;
    client_id: string;
    user_id: string;
    legacy_entry_id: string;
  }>(
    `SELECT
       max(value) FILTER (WHERE key='workspace_id') AS workspace_id,
       max(value) FILTER (WHERE key='other_workspace_id') AS other_workspace_id,
       max(value) FILTER (WHERE key='project_id') AS project_id,
       max(value) FILTER (WHERE key='second_project_id') AS second_project_id,
       max(value) FILTER (WHERE key='other_project_id') AS other_project_id,
       max(value) FILTER (WHERE key='client_id') AS client_id,
       max(value) FILTER (WHERE key='user_id') AS user_id,
       max(value) FILTER (WHERE key='legacy_entry_id') AS legacy_entry_id
     FROM phase2_fixture_ids
     WHERE prefix=$1`,
    [prefix],
  );
  const fixture = fixtures.rows[0];
  assert.ok(fixture.workspace_id && fixture.other_workspace_id && fixture.project_id && fixture.other_project_id);

  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name IN ('activities','project_activities')
     ORDER BY table_name`,
  );
  assert.deepEqual(tables.rows.map((row) => row.table_name), ["activities", "project_activities"]);
  pass("Activity catalog tables exist");

  const activityColumn = await pool.query<{ is_nullable: string }>(
    `SELECT is_nullable FROM information_schema.columns
     WHERE table_schema='public' AND table_name='time_entries' AND column_name='activity_id'`,
  );
  assert.equal(activityColumn.rowCount, 1);
  assert.equal(activityColumn.rows[0].is_nullable, "YES");
  const legacy = await pool.query<{ activity_id: string | null }>(
    "SELECT activity_id FROM time_entries WHERE id=$1",
    [fixture.legacy_entry_id],
  );
  assert.equal(legacy.rows[0].activity_id, null);
  pass("legacy time entry stays uncategorized after additive migration");

  const activityId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO activities
       (id, workspace_id, name, default_billable, default_hourly_rate, status)
     VALUES ($1,$2,'Development',true,80000,'active')`,
    [activityId, fixture.workspace_id],
  );
  await expectReject(
    "normalized active Activity name is unique per workspace",
    () => pool.query(
      `INSERT INTO activities (workspace_id,name,status)
       VALUES ($1,'  development  ','active')`,
      [fixture.workspace_id],
    ),
    /activities_workspace_active_name_uidx/,
  );

  await pool.query(
    `INSERT INTO project_activities
       (workspace_id,project_id,activity_id,enabled,rate_override,billable_override)
     VALUES ($1,$2,$3,true,95000,true), ($1,$4,$3,true,null,null)`,
    [fixture.workspace_id, fixture.project_id, activityId, fixture.second_project_id],
  );
  const reuse = await pool.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM project_activities WHERE activity_id=$1 AND enabled=true",
    [activityId],
  );
  assert.equal(reuse.rows[0].count, 2);
  pass("one workspace Activity is reusable across Projects with optional overrides");

  await expectReject(
    "cross-workspace Project Activity mapping is rejected",
    () => pool.query(
      `INSERT INTO project_activities (workspace_id,project_id,activity_id,enabled)
       VALUES ($1,$2,$3,true)`,
      [fixture.other_workspace_id, fixture.other_project_id, activityId],
    ),
    /project_activities_activity_workspace_fk/,
  );

  await expectReject(
    "cross-workspace Activity on time entry is rejected",
    () => pool.query(
      `INSERT INTO time_entries
       (workspace_id,client_id,project_id,activity_id,user_id,description,start_time,end_time,manual_minutes,billable,status)
       VALUES ($1,null,$2,$3,$4,'Cross tenant',now(),now(),15,false,'draft')`,
      [fixture.other_workspace_id, fixture.other_project_id, activityId, fixture.user_id],
    ),
    /time_entries_activity_workspace_fk/,
  );

  const categorizedEntryId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO time_entries
       (id,workspace_id,client_id,project_id,activity_id,user_id,description,start_time,end_time,manual_minutes,billable,status)
     VALUES ($1,$2,$3,$4,$5,$6,'Different description per log',now()-interval '30 minutes',now(),30,true,'approved')`,
    [
      categorizedEntryId,
      fixture.workspace_id,
      fixture.client_id,
      fixture.project_id,
      activityId,
      fixture.user_id,
    ],
  );
  await pool.query("UPDATE activities SET status='archived', updated_at=now() WHERE id=$1", [activityId]);
  const history = await pool.query<{ activity_name: string; activity_status: string; description: string }>(
    `SELECT a.name AS activity_name, a.status AS activity_status, te.description
     FROM time_entries te JOIN activities a ON a.id=te.activity_id
     WHERE te.id=$1`,
    [categorizedEntryId],
  );
  assert.deepEqual(history.rows[0], {
    activity_name: "Development",
    activity_status: "archived",
    description: "Different description per log",
  });
  pass("archiving Activity preserves categorized history and independent description");

  await expectReject(
    "Activity referenced by history cannot be hard deleted",
    () => pool.query("DELETE FROM activities WHERE id=$1", [activityId]),
    /time_entries_activity_workspace_fk/,
  );

  await pool.query(
    `INSERT INTO activities (workspace_id,name,status)
     VALUES ($1,' development ','active')`,
    [fixture.workspace_id],
  );
  pass("archived normalized name can be reused by a new active Activity");

  await expectReject(
    "negative Activity default rate is rejected",
    () => pool.query(
      `INSERT INTO activities (workspace_id,name,default_hourly_rate,status)
       VALUES ($1,'Invalid rate',-1,'active')`,
      [fixture.workspace_id],
    ),
    /activities_default_hourly_rate_check/,
  );

  console.log(`database=${targetDatabase}`);
  for (const result of results) console.log(result);
  console.log(`PASS\t${results.length} Phase 2 behavioral DB checks`);
} finally {
  await pool.end();
}
