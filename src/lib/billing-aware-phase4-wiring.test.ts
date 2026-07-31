import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const read=(p:string)=>readFileSync(join(process.cwd(),p),"utf8");
describe("billing-aware Phase 4 Project Task UX",()=>{
 it("shows canonical billing models and contextual fields",()=>{const f=read("src/components/forms/project-form.tsx");expect(f).toContain("Harga Tetap");expect(f).toContain("Per Jam");expect(f).toContain("Retainer");expect(f).toContain("retainerIncludedMinutes");expect(f).not.toContain("By Package");expect(f).not.toContain("Layanan Project");expect(f).not.toContain("activityRequired")});
 it("accepts canonical model and validates retainer",()=>{const a=read("src/lib/actions/projects.ts");expect(a).toContain("billingModel");expect(a).toContain("retainerIncludedMinutes");expect(a).toContain("validateRetainerConfiguration")});
 it("blocks billing model transition after history",()=>{const a=read("src/lib/actions/projects.ts");expect(a).toContain("assertBillingModelTransitionAllowed");expect(a).toContain("timeEntries");expect(a).toContain("invoices")});
 it("derives canonical task mode while retaining compatibility form until page replacement",()=>{const a=read("src/lib/actions/tasks.ts");expect(a).toContain("resolveProjectTaskMode");expect(a).toContain("mode: projectMode");expect(a).toContain('behavior: projectMode === "workflow"');const f=read("src/components/forms/task-form.tsx");expect(f).toContain("Aktivitas berulang");expect(f).toContain("Sekali selesai");expect(f).toContain("Model billing memberi pilihan awal")});
});
