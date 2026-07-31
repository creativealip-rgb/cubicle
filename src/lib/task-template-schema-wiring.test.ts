import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/db/schema.ts", "utf8");
const migration = readFileSync("drizzle/0064_billing_aware_task_templates.sql", "utf8");

describe("billing-aware task template schema", () => {
  it("adds canonical project policy and task mode, lifecycle, and provenance", () => {
    expect(schema).toContain('taskModePolicy: text("task_mode_policy", { enum: ["billing_default", "workflow", "reusable", "mixed"] })');
    expect(schema).toContain('mode: text("mode", { enum: ["workflow", "reusable"] }).notNull().default("workflow")');
    expect(schema).toContain('lifecycle: text("lifecycle", { enum: ["active", "archived"] }).notNull().default("active")');
    expect(schema).toContain('templateItemSourceId: uuid("template_item_source_id")');
    expect(schema).toContain('check("projects_task_mode_policy_check"');
    expect(schema).toContain('name: "tasks_project_workspace_fk"');
  });

  it("exports tenant-safe templates and ordered items", () => {
    expect(schema).toContain('export const taskTemplates = pgTable("task_templates"');
    expect(schema).toMatch(/createdBy: text\("created_by"\)\.notNull\(\)\.references\(\(\) => users\.id, \{ onDelete: "restrict" \}\)/);
    expect(schema).toContain('export const taskTemplateItems = pgTable("task_template_items"');
    expect(schema).toContain('enum: ["fixed_price", "hourly_retainer", "all"]');
    expect(schema).toContain('task_templates_workspace_active_normalized_name_uidx');
    expect(schema).toContain('unique("task_templates_id_workspace_unique")');
    expect(schema).toContain('unique("task_template_items_template_position_unique")');
    expect(schema).toContain('name: "task_template_items_template_workspace_fk"');
    expect(schema).toContain('name: "task_template_items_assignee_workspace_fk"');
    expect(schema).toContain('check("task_template_items_position_check"');
  });

  it("exports tenant-safe idempotent import ledger", () => {
    expect(schema).toContain('export const taskTemplateImports = pgTable("task_template_imports"');
    expect(schema).toContain('payloadFingerprint: text("payload_fingerprint").notNull()');
    expect(schema).toContain('result: jsonb("result")');
    expect(schema).toContain('unique("task_template_imports_idempotency_unique")');
    expect(schema).toContain('name: "task_template_imports_project_workspace_fk"');
  });

  it("keeps migration allocation committed and retired cleanup prohibited", () => {
    const registry = readFileSync("docs/migration-registry.md", "utf8");
    const runner = readFileSync("scripts/migrate-ledger.sh", "utf8");
    expect(registry).toMatch(/0064[^\n]*committed/);
    expect(registry).toMatch(/0062[^\n]*(retired|must not run)/i);
    expect(runner).toContain("RETIRED_MIGRATIONS=${RETIRED_MIGRATIONS:-0062_billing_aware_phase9_cleanup.sql}");
  });

  it("ships additive migration with conservative complete backfill", () => {
    expect(migration).toMatch(/projects_id_workspace_unique[\s\S]*UNIQUE \("id", "workspace_id"\)/);
    expect(migration.indexOf('projects_id_workspace_unique')).toBeLessThan(migration.indexOf('task_template_imports_project_workspace_fk'));
    expect(migration).toMatch(/"created_by" text NOT NULL REFERENCES "users"\("id"\) ON DELETE RESTRICT/);
    expect(migration).toMatch(/task_template_items_template_workspace_fk[\s\S]*FOREIGN KEY \("template_id", "workspace_id"\)/);
    expect(migration).toMatch(/tasks_template_item_source_workspace_fk[\s\S]*FOREIGN KEY \("template_item_source_id", "workspace_id"\)/);
    expect(migration).toMatch(/"behavior"\s*=\s*'one_time' THEN 'workflow'/);
    expect(migration).toMatch(/"behavior"\s*=\s*'recurring' THEN 'reusable'/);
    expect(migration).toMatch(/"billing_model"\s*=\s*'legacy_package'/);
    expect(migration).toContain('ALTER COLUMN "mode" SET NOT NULL');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "task_templates"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "task_template_items"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "task_template_imports"');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)\b/i);
    expect(migration).not.toMatch(/DROP[^;]*(activities|services)/i);
  });
});
