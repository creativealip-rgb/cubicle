import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/lib/actions/task-templates.ts", "utf8");

describe("atomic flat task-template import wiring", () => {
  it("exports preview and import actions", () => {
    expect(source).toMatch(/export async function previewTaskTemplateImport\b/);
    expect(source).toMatch(/export async function importTaskTemplates\b/);
  });

  it("loads destination project and templates tenant-safely", () => {
    expect(source).toContain("taskTemplates.workspaceId");
    expect(source).toContain("taskTemplateItems.workspaceId");
    expect(source).toContain("projects.workspaceId");
    expect(source).toContain("assertAssigneeMembership");
  });

  it("repeats validation and inserts flat tasks in one transaction", () => {
    expect(source).toContain("db.transaction");
    expect(source).toContain("tx.insert(tasks)");
    expect(source).toContain("templateItemSourceId");
    expect(source).not.toMatch(/parent(Task|Group|List)Id/);
  });

  it("uses ledger key, fingerprint, advisory lock, and stored result", () => {
    expect(source).toContain("taskTemplateImports");
    expect(source).toContain("payloadFingerprint");
    expect(source).toContain("IDEMPOTENCY_CONFLICT");
    expect(source).toContain("pg_advisory_xact_lock");
    expect(source).toContain("completedAt");
  });
});
