import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 0A containment wiring", () => {
  it("creates package orders from server-authoritative package data only", () => {
    const action = read("src/lib/actions/package-orders.ts");
    const button = read("src/components/portal/package-order-button.tsx");
    expect(action).toContain("getClientPortalAccess(parsed.credential)");
    expect(action).toContain("eq(projects.clientId, client.id)");
    expect(action).toContain("eq(packages.workspaceId, projects.workspaceId)");
    expect(action).toContain("resource.packageProjectId !== resource.projectId");
    expect(action).toContain("const authoritativePrice = resource.customPrice ?? resource.price");
    expect(action).toContain("clientPortalToken: null");
    expect(action).toContain("idempotencyKey: parsed.idempotencyKey");
    const submitPayload = button.slice(
      button.indexOf("await createPackageOrder({"),
      button.indexOf("});", button.indexOf("await createPackageOrder({")),
    );
    expect(submitPayload).not.toContain("packageName");
    expect(submitPayload).not.toContain("price");
    expect(submitPayload).not.toContain("currency");
  });

  it("stores custom package requests under resolved client identity with bounded hours", () => {
    const action = read("src/lib/actions/custom-package-requests.ts");
    expect(action).toContain("getClientPortalAccess(parsed.credential)");
    expect(action).toContain("eq(projects.clientId, client.id)");
    expect(action).toContain("eq(packages.allowCustom, true)");
    expect(action).toContain("parsed.hours < min || parsed.hours > max");
    expect(action).toContain("clientPortalToken: null");
    expect(action).toContain("idempotencyKey: parsed.idempotencyKey");
    expect(action).toContain("assertWorkspaceWritable");
    expect(action).toContain("eq(customPackageRequests.status, \"pending\")");
  });

  it("archives packages instead of hard-deleting commercial history", () => {
    const action = read("src/lib/actions/packages.ts");
    const migration = read("drizzle/0046_phase0a_integrity_containment.sql");
    expect(action).toContain(".set({ active: false })");
    expect(action).not.toContain("db.delete(packages)");
    expect(migration).toContain("FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT");
    expect(migration).toContain("FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL");
  });

  it("guards timer context, ownership, and active timer uniqueness", () => {
    const time = read("src/lib/actions/time.ts");
    const context = read("src/lib/time-entry-context.ts");
    const migration = read("drizzle/0046_phase0a_integrity_containment.sql");
    expect(context).toContain("Project tidak sesuai dengan Client/workspace");
    expect(context).toContain("Task tidak sesuai dengan Project/workspace");
    expect(time).toContain("assertTimeEntryContext(db, parsed.workspaceId, parsed)");
    expect(time).toContain("entry.userId !== user.id");
    expect(time).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("WHERE end_time IS NULL AND manual_minutes IS NULL");
  });

  it("requires approved billable completed time with snapshot rate before invoicing", () => {
    const invoices = read("src/lib/actions/invoices.ts");
    const rules = read("src/lib/invoice-finance-rules.ts");
    const schema = read("src/db/schema.ts");
    expect(invoices).toContain("eq(timeEntries.status, \"approved\")");
    expect(invoices).toContain("eq(timeEntries.billable, true)");
    expect(invoices).toContain("isNotNull(timeEntries.endTime)");
    expect(invoices).toContain("Time Entry belum memiliki billing rate snapshot");
    expect(invoices).toContain("previousTimeEntryStatus: \"approved\"");
    expect(rules).toContain("sent");
    expect(rules).toContain("viewed");
    expect(rules).toContain("overdue");
    expect(schema).toContain("previousTimeEntryStatus");
  });
});
