#!/usr/bin/env node
import assert from "node:assert/strict";
import process from "node:process";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
const expectedDatabase = process.env.EXPECTED_DATABASE?.trim() || "cubicle_phase4_it";
const prefix = process.env.FIXTURE_PREFIX?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!prefix) throw new Error("FIXTURE_PREFIX is required");
const targetDatabase = new URL(databaseUrl).pathname.replace(/^\//, "");
if (targetDatabase !== expectedDatabase) {
  throw new Error(`Refusing integration test: expected ${expectedDatabase}, got ${targetDatabase || "<empty>"}`);
}
if (!/^cubicle_phase4_it(?:_[A-Za-z0-9_]+)?$/.test(targetDatabase) || targetDatabase === "cubicle") {
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
    other_project_id: string;
    project_id: string;
    hidden_project_id: string;
    client_id: string;
    portal_slug: string;
    user_id: string;
  }>(
    `SELECT
       max(value) FILTER (WHERE key='workspace_id') AS workspace_id,
       max(value) FILTER (WHERE key='other_workspace_id') AS other_workspace_id,
       max(value) FILTER (WHERE key='other_project_id') AS other_project_id,
       max(value) FILTER (WHERE key='project_id') AS project_id,
       max(value) FILTER (WHERE key='hidden_project_id') AS hidden_project_id,
       max(value) FILTER (WHERE key='client_id') AS client_id,
       max(value) FILTER (WHERE key='portal_slug') AS portal_slug,
       max(value) FILTER (WHERE key='user_id') AS user_id
     FROM phase4_fixture_ids
     WHERE prefix=$1`,
    [prefix],
  );
  const fixture = fixtures.rows[0];
  assert.ok(fixture.workspace_id && fixture.other_workspace_id && fixture.other_project_id && fixture.project_id && fixture.client_id && fixture.portal_slug);

  const tables = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name IN ('package_items','project_package_assignments')
     ORDER BY table_name`,
  );
  assert.deepEqual(tables.rows.map((row) => row.table_name), ["package_items", "project_package_assignments"]);
  pass("Package builder tables exist");

  const additiveColumns = await pool.query<{ table_name: string; column_name: string; is_nullable: string }>(
    `SELECT table_name, column_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema='public'
       AND ((table_name='project_services' AND column_name IN ('package_item_id','project_package_assignment_id','source_package_assignment_id'))
         OR (table_name='package_orders' AND column_name='project_package_assignment_id'))
     ORDER BY table_name, column_name`,
  );
  assert.deepEqual(additiveColumns.rows.map((row) => `${row.table_name}.${row.column_name}:${row.is_nullable}`), [
    "package_orders.project_package_assignment_id:YES",
    "project_services.package_item_id:YES",
    "project_services.project_package_assignment_id:YES",
    "project_services.source_package_assignment_id:YES",
  ]);
  pass("legacy Project Service and Package Order rows stay valid with nullable Package Builder links");

  const serviceA = crypto.randomUUID();
  const serviceB = crypto.randomUUID();
  const packageA = crypto.randomUUID();
  const packageItemA = crypto.randomUUID();
  const packageItemB = crypto.randomUUID();
  const assignmentA = crypto.randomUUID();
  await pool.query(
    `INSERT INTO services
       (id,workspace_id,name,normalized_name,description,default_pricing_model,default_unit,default_price,currency,status,created_by)
     VALUES ($1,$2,'Landing Page','landing page','Landing build','fixed','service',3000000,'IDR','active',$3),
            ($4,$2,'Monthly QA','monthly qa','QA support','hourly','hour',250000,'IDR','active',$3)`,
    [serviceA, fixture.workspace_id, fixture.user_id, serviceB],
  );
  await pool.query(
    `INSERT INTO packages (id,workspace_id,name,description,hours,price,currency,allowance_type,allowance_value,lifecycle_class,status,active)
     VALUES ($1,$2,'Launch Kit','Snapshot package',20,5000000,'IDR','hours',20,'one_off','active',true)`,
    [packageA, fixture.workspace_id],
  );
  await pool.query(
    `INSERT INTO package_items
       (id,workspace_id,package_id,service_id,quantity,unit,unit_price,currency,included_allowance,sort_order,status)
     VALUES ($1,$2,$3,$4,1,'service',3000000,'IDR',null,0,'active'),
            ($5,$2,$3,$6,4,'hour',250000,'IDR',4,1,'active')`,
    [packageItemA, fixture.workspace_id, packageA, serviceA, packageItemB, serviceB],
  );
  pass("Package catalog composes multiple Services");

  const otherService = crypto.randomUUID();
  const otherPackage = crypto.randomUUID();
  await pool.query(
    `INSERT INTO services
       (id,workspace_id,name,normalized_name,description,default_pricing_model,default_unit,default_price,currency,status)
     VALUES ($1,$2,'Other Service','other service','Other tenant','fixed','service',100000,'IDR','active')`,
    [otherService, fixture.other_workspace_id],
  );
  await pool.query(
    `INSERT INTO packages (id,workspace_id,project_id,name,hours,price,currency,allowance_type,allowance_value,lifecycle_class,status,active)
     VALUES ($1,$2,$3,'Other Package',1,100000,'IDR','hours',1,'one_off','active',true)`,
    [otherPackage, fixture.other_workspace_id, fixture.other_project_id],
  );
  await expectReject(
    "cross-workspace Package Item service mapping is rejected",
    () => pool.query(
      `INSERT INTO package_items (workspace_id,package_id,service_id,quantity,unit,status)
       VALUES ($1,$2,$3,1,'service','active')`,
      [fixture.workspace_id, packageA, otherService],
    ),
    /package_items_service_workspace_fk/,
  );
  await expectReject(
    "cross-workspace Package Item package mapping is rejected",
    () => pool.query(
      `INSERT INTO package_items (workspace_id,package_id,service_id,quantity,unit,status)
       VALUES ($1,$2,$3,1,'service','active')`,
      [fixture.workspace_id, otherPackage, serviceA],
    ),
    /package_items_package_workspace_fk/,
  );
  await expectReject(
    "negative Package Item allowance is rejected",
    () => pool.query(
      `INSERT INTO package_items (workspace_id,package_id,service_id,quantity,unit,included_allowance,status)
       VALUES ($1,$2,$3,1,'service',-1,'active')`,
      [fixture.workspace_id, packageA, serviceA],
    ),
    /package_items_included_allowance_check/,
  );

  await pool.query(
    `INSERT INTO project_package_assignments
       (id,workspace_id,project_id,source_package_id,source_lifecycle_class,name_snapshot,description_snapshot,price_snapshot,currency_snapshot,allowance_type_snapshot,allowance_value_snapshot,status)
     VALUES ($1,$2,$3,$4,'one_off','Launch Kit','Snapshot package',5000000,'IDR','hours',20,'active')`,
    [assignmentA, fixture.workspace_id, fixture.project_id, packageA],
  );
  await expectReject(
    "only one active Project Package assignment is allowed",
    () => pool.query(
      `INSERT INTO project_package_assignments
         (workspace_id,project_id,source_package_id,name_snapshot,price_snapshot,currency_snapshot,allowance_type_snapshot,status)
       VALUES ($1,$2,$3,'Duplicate',1,'IDR','hours','active')`,
      [fixture.workspace_id, fixture.project_id, packageA],
    ),
    /project_package_assignments_active_project_uidx/,
  );

  const projectServiceId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO project_services
       (id,workspace_id,project_id,service_id,package_item_id,project_package_assignment_id,source_package_assignment_id,name_snapshot,description_snapshot,pricing_model_snapshot,quantity,unit,unit_price,currency_snapshot,amount,included_allowance,sort_order,status)
     VALUES ($1,$2,$3,$4,$5,$6,$6,'Landing Page','Landing build','fixed',1,'service',3000000,'IDR',3000000,null,0,'active')`,
    [projectServiceId, fixture.workspace_id, fixture.project_id, serviceA, packageItemA, assignmentA],
  );
  await pool.query("UPDATE packages SET name='Launch Kit v2', status='archived', active=false, updated_at=now() WHERE id=$1", [packageA]);
  await pool.query("UPDATE services SET name='Landing Page v2', status='archived', updated_at=now() WHERE id=$1", [serviceA]);
  const snapshots = await pool.query<{
    assignment_name: string;
    project_service_name: string;
    package_name: string;
    service_name: string;
  }>(
    `SELECT ppa.name_snapshot AS assignment_name,
            ps.name_snapshot AS project_service_name,
            p.name AS package_name,
            s.name AS service_name
     FROM project_package_assignments ppa
     JOIN project_services ps ON ps.project_package_assignment_id=ppa.id
     LEFT JOIN packages p ON p.id=ppa.source_package_id
     LEFT JOIN services s ON s.id=ps.service_id
     WHERE ppa.id=$1 AND ps.id=$2`,
    [assignmentA, projectServiceId],
  );
  assert.deepEqual(snapshots.rows[0], {
    assignment_name: "Launch Kit",
    project_service_name: "Landing Page",
    package_name: "Launch Kit v2",
    service_name: "Landing Page v2",
  });
  pass("Project Package and Service snapshots preserve contract text after catalog archive/rename");

  const taskId = crypto.randomUUID();
  const entryId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO tasks (id,workspace_id,project_id,project_service_id,title,status,priority,position,client_visible)
     VALUES ($1,$2,$3,$4,'Package service task','todo','medium',0,true)`,
    [taskId, fixture.workspace_id, fixture.project_id, projectServiceId],
  );
  await pool.query(
    `INSERT INTO time_entries
       (id,workspace_id,client_id,project_id,project_service_id,user_id,description,start_time,end_time,manual_minutes,billable,status)
     VALUES ($1,$2,$3,$4,$5,$6,'Package service time',now()-interval '45 minutes',now(),45,true,'approved')`,
    [entryId, fixture.workspace_id, fixture.client_id, fixture.project_id, projectServiceId, fixture.user_id],
  );
  await pool.query("UPDATE project_services SET status='archived', updated_at=now() WHERE id=$1", [projectServiceId]);
  const historyLinks = await pool.query<{ task_link: string | null; entry_link: string | null }>(
    `SELECT
       (SELECT project_service_id::text FROM tasks WHERE id=$1) AS task_link,
       (SELECT project_service_id::text FROM time_entries WHERE id=$2) AS entry_link`,
    [taskId, entryId],
  );
  assert.equal(historyLinks.rows[0].task_link, projectServiceId);
  assert.equal(historyLinks.rows[0].entry_link, projectServiceId);
  pass("archived Package Service snapshot keeps Task and Time history links");

  const orderId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO package_orders
       (id,workspace_id,project_id,package_id,project_package_assignment_id,client_id,client_portal_token,package_name,hours,price,currency,status,idempotency_key)
     VALUES ($1,$2,$3,$4,$5,$6,null,'Launch Kit',20,5000000,'IDR','pending',$7)`,
    [orderId, fixture.workspace_id, fixture.project_id, packageA, assignmentA, fixture.client_id, `${prefix}-order-key`],
  );
  await pool.query("UPDATE project_package_assignments SET status='archived', updated_at=now() WHERE id=$1", [assignmentA]);
  const orderSnapshot = await pool.query<{ package_name: string; assignment_status: string | null; client_portal_token: string | null }>(
    `SELECT po.package_name, ppa.status AS assignment_status, po.client_portal_token
     FROM package_orders po LEFT JOIN project_package_assignments ppa ON ppa.id=po.project_package_assignment_id
     WHERE po.id=$1`,
    [orderId],
  );
  assert.deepEqual(orderSnapshot.rows[0], {
    package_name: "Launch Kit",
    assignment_status: "archived",
    client_portal_token: null,
  });
  pass("Package Order history uses snapshots after assignment archive");

  const hiddenAssignment = crypto.randomUUID();
  await pool.query(
    `INSERT INTO project_package_assignments
       (id,workspace_id,project_id,source_package_id,name_snapshot,price_snapshot,currency_snapshot,allowance_type_snapshot,status)
     VALUES ($1,$2,$3,null,'Hidden Package',1,'IDR','hours','active')`,
    [hiddenAssignment, fixture.workspace_id, fixture.hidden_project_id],
  );
  const visibleAssignments = await pool.query<{ id: string }>(
    `SELECT ppa.id
     FROM project_package_assignments ppa
     JOIN projects p ON p.id=ppa.project_id AND p.workspace_id=ppa.workspace_id
     JOIN clients c ON c.id=p.client_id AND c.workspace_id=ppa.workspace_id
     AND c.portal_slug=$1
       AND c.id=$2
       AND ppa.workspace_id=$3
       AND p.client_visible=true
       AND ppa.status='active'`,
    [fixture.portal_slug, fixture.client_id, fixture.workspace_id],
  );
  assert.equal(visibleAssignments.rows.length, 0);
  pass("portal authority excludes hidden client projects server-side");

  console.log(`database=${targetDatabase}`);
  for (const result of results) console.log(result);
  console.log(`PASS\t${results.length} Phase 4 behavioral DB checks`);
} finally {
  await pool.end();
}
