#!/usr/bin/env node
import assert from "node:assert/strict";
import process from "node:process";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedDatabase = process.env.EXPECTED_DATABASE?.trim() || "cubicle_phase3_it";
const prefix = process.env.FIXTURE_PREFIX?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!prefix) throw new Error("FIXTURE_PREFIX is required");
const targetDatabase = new URL(databaseUrl).pathname.replace(/^\//, "");
if (targetDatabase !== expectedDatabase) {
  throw new Error(`Refusing integration test: expected ${expectedDatabase}, got ${targetDatabase || "<empty>"}`);
}
if (!/^cubicle_phase3_it(?:_[A-Za-z0-9_]+)?$/.test(targetDatabase) || targetDatabase === "cubicle") {
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
  const identity = await pool.query<{ database_name: string; database_user: string }>(
    "SELECT current_database() AS database_name, current_user AS database_user",
  );
  console.log(`identity=${JSON.stringify(identity.rows[0])}`);

  const fixtures = await pool.query<{
    workspace_id: string;
    other_workspace_id: string;
    project_id: string;
    client_id: string;
    user_id: string;
  }>(
    `SELECT
       max(value) FILTER (WHERE key='workspace_id') AS workspace_id,
       max(value) FILTER (WHERE key='other_workspace_id') AS other_workspace_id,
       max(value) FILTER (WHERE key='project_id') AS project_id,
       max(value) FILTER (WHERE key='client_id') AS client_id,
       max(value) FILTER (WHERE key='user_id') AS user_id
     FROM phase3_fixture_ids
     WHERE prefix=$1`,
    [prefix],
  );
  const fixture = fixtures.rows[0];
  assert.ok(fixture.workspace_id && fixture.other_workspace_id && fixture.project_id && fixture.client_id);

  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name IN ('service_categories','services','project_services')
     ORDER BY table_name`,
  );
  assert.deepEqual(tables.rows.map((row) => row.table_name), ["project_services", "service_categories", "services"]);
  pass("Service catalog tables exist");

  const nullableColumns = await pool.query<{ table_name: string; column_name: string; is_nullable: string }>(
    `SELECT table_name, column_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema='public'
       AND ((table_name='tasks' AND column_name='project_service_id')
         OR (table_name='time_entries' AND column_name='project_service_id'))
     ORDER BY table_name, column_name`,
  );
  assert.deepEqual(nullableColumns.rows.map((row) => `${row.table_name}.${row.column_name}:${row.is_nullable}`), [
    "tasks.project_service_id:YES",
    "time_entries.project_service_id:YES",
  ]);
  pass("legacy Task and Time rows remain valid with nullable Project Service link");

  const serviceA = crypto.randomUUID();
  const serviceB = crypto.randomUUID();
  await pool.query(
    `INSERT INTO services
       (id,workspace_id,name,normalized_name,description,default_pricing_model,default_unit,default_price,currency,status,created_by)
     VALUES ($1,$2,'Design System','design system','UI kit','fixed','service',2500000,'IDR','active',$3),
            ($4,$2,'Hourly QA','hourly qa','QA pass','hourly','hour',175000,'IDR','active',$3)`,
    [serviceA, fixture.workspace_id, fixture.user_id, serviceB],
  );
  await expectReject(
    "active Service normalized name is unique per workspace",
    () => pool.query(
      `INSERT INTO services (workspace_id,name,normalized_name,status)
       VALUES ($1,'  Design System  ','design system','active')`,
      [fixture.workspace_id],
    ),
    /services_workspace_active_normalized_name_uidx/,
  );

  const projectServiceId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO project_services
       (id,workspace_id,project_id,service_id,name_snapshot,description_snapshot,pricing_model_snapshot,quantity,unit,unit_price,currency_snapshot,amount,included_allowance,sort_order,status)
     VALUES ($1,$2,$3,$4,'Design System','UI kit','fixed',2,'service',2500000,'IDR',5000000,null,0,'active')`,
    [projectServiceId, fixture.workspace_id, fixture.project_id, serviceA],
  );
  await pool.query("UPDATE services SET name='Design System v2', status='archived', updated_at=now() WHERE id=$1", [serviceA]);
  const snapshot = await pool.query<{ name_snapshot: string; service_name: string; service_status: string; amount: string }>(
    `SELECT ps.name_snapshot, s.name AS service_name, s.status AS service_status, ps.amount::text
     FROM project_services ps JOIN services s ON s.id=ps.service_id
     WHERE ps.id=$1`,
    [projectServiceId],
  );
  assert.deepEqual(snapshot.rows[0], {
    name_snapshot: "Design System",
    service_name: "Design System v2",
    service_status: "archived",
    amount: "5000000.00",
  });
  pass("Project Service snapshot preserves contract text after catalog archive/rename");

  await expectReject(
    "cross-workspace Project Service mapping is rejected",
    () => pool.query(
      `INSERT INTO project_services (workspace_id,project_id,service_id,name_snapshot,status)
       VALUES ($1,$2,$3,'Cross workspace','active')`,
      [fixture.other_workspace_id, fixture.project_id, serviceB],
    ),
    /project_services_project_workspace_fk|project_services_service_workspace_fk/,
  );
  await expectReject(
    "negative Project Service amount is rejected",
    () => pool.query(
      `INSERT INTO project_services (workspace_id,project_id,service_id,name_snapshot,amount,status)
       VALUES ($1,$2,$3,'Invalid',-1,'active')`,
      [fixture.workspace_id, fixture.project_id, serviceB],
    ),
    /project_services_amount_check/,
  );

  const taskId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO tasks (id,workspace_id,project_id,project_service_id,title,status,priority,position,client_visible)
     VALUES ($1,$2,$3,$4,'Service-linked task','todo','medium',0,false)`,
    [taskId, fixture.workspace_id, fixture.project_id, projectServiceId],
  );
  const entryId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO time_entries
       (id,workspace_id,client_id,project_id,project_service_id,user_id,description,start_time,end_time,manual_minutes,billable,status)
     VALUES ($1,$2,$3,$4,$5,$6,'Service-linked time',now()-interval '30 minutes',now(),30,true,'approved')`,
    [entryId, fixture.workspace_id, fixture.client_id, fixture.project_id, projectServiceId, fixture.user_id],
  );
  await pool.query("UPDATE project_services SET status='archived', updated_at=now() WHERE id=$1", [projectServiceId]);
  const links = await pool.query<{ task_link: string | null; entry_link: string | null }>(
    `SELECT
       (SELECT project_service_id::text FROM tasks WHERE id=$1) AS task_link,
       (SELECT project_service_id::text FROM time_entries WHERE id=$2) AS entry_link`,
    [taskId, entryId],
  );
  assert.equal(links.rows[0].task_link, projectServiceId);
  assert.equal(links.rows[0].entry_link, projectServiceId);
  pass("archived Project Service keeps Task and Time history links");

  console.log(`database=${targetDatabase}`);
  for (const result of results) console.log(result);
  console.log(`PASS\t${results.length} Phase 3 behavioral DB checks`);
} finally {
  await pool.end();
}
