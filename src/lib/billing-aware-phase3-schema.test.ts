import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read=(p:string)=>readFileSync(join(process.cwd(),p),"utf8");
describe("billing-aware Phase 3 schema",()=>{
 it("defines retainer config and timezone",()=>{const s=read("src/db/schema.ts");expect(s).toContain("retainerIncludedMinutes");expect(s).toContain('timezone: text("timezone")');expect(read("drizzle/0057_retainer_configuration.sql")).toContain("projects_retainer_configuration_check")});
 it("defines tenant-safe period ledger and time linkage",()=>{const s=read("src/db/schema.ts");expect(s).toContain("export const retainerPeriods");expect(s).toContain("retainerPeriodId");expect(read("drizzle/0058_retainer_period_ledger.sql")).toContain("time_entries_retainer_period_workspace_fk")});
 it("defines invoice source integrity",()=>{const s=read("src/db/schema.ts");expect(s).toContain("billingSource");expect(s).toContain("billingPeriodStart");expect(read("drizzle/0059_invoice_source_integrity.sql")).toContain("invoices_active_retainer_period_unique")});
 it("defines task behavior and classification",()=>{const s=read("src/db/schema.ts");expect(s).toContain('behavior: text("behavior"');expect(s).toContain("legacyProjectBillingClassifications");expect(read("drizzle/0060_task_behavior.sql")).toContain("tasks_behavior_check");expect(read("drizzle/0061_legacy_billing_classification.sql")).toContain("legacy_project_billing_classifications")});
});
