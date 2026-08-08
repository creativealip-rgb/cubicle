import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 1 project time tracking wiring", () => {
  it("adds additive project mode columns and deterministic backfill", () => {
    const schema = read("src/db/schema.ts");
    const migration = read("drizzle/0047_project_time_tracking_mode.sql");

    expect(schema).toContain('timeTrackingMode: text("time_tracking_mode"');
    expect(schema).toContain('["off", "internal", "billable"]');
    expect(schema).toContain('activityRequired: boolean("activity_required")');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "time_tracking_mode" text');
    expect(migration).toContain("WHEN p.billing_type = 'hours' THEN 'billable'");
    expect(migration).toContain("WHEN p.billing_type = 'package' AND pkg.hours > 0 THEN 'billable'");
    expect(migration).toContain("ELSE 'internal'");
    expect(migration).toContain("CHECK (time_tracking_mode IN ('off', 'internal', 'billable'))");
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "activity_required" boolean');
  });

  it("enforces project mode across start, task quick-start, manual, reassign, and stop", () => {
    const time = read("src/lib/actions/time.ts");
    expect(time).toContain("assertProjectTimeTrackingEnabled(db, parsed.workspaceId, parsed.projectId)");
    expect(time).toContain("assertProjectTimeTrackingEnabled(db, workspaceId, row.projectId)");
    expect(time).toContain("assertProjectTimeTrackingEnabled(db, workspaceId, nextProjectId)");
    expect(time).toContain("assertHistoricalTimeEntryMutable(db, workspaceId, entry.projectId)");
    expect(time).toContain("await assertProjectTimeTrackingEnabled(db, workspaceId, entry.projectId)");
    expect(time).not.toContain("Project wajib dipilih sebelum timer dihentikan");
    expect(time).toContain("timeEntryBillableForMode");

    const projectsAction = read("src/lib/actions/projects.ts");
    expect(projectsAction).toContain("const projectUpdateSchema = projectInputSchema.partial()");
    expect(projectsAction).toContain("const parsed = projectUpdateSchema.parse(input)");
    expect(projectsAction).not.toContain("projectSchema.partial().parse(input)");
  });


  it("keeps canonical billing defaults and empty timers aligned with direct controls", () => {
    const projectForm = read("src/components/forms/project-form.tsx");
    const timerWidget = read("src/components/time/timer-widget.tsx");
    const topbar = read("src/components/app-topbar.tsx");

    expect(projectForm).toContain(
      'defaultValues?.billingType === "hours" || defaultValues?.billingType === "hourly"'
    );
    expect(projectForm).toMatch(/t\("Harga Tetap".*?Fixed Price/);
    expect(projectForm).toMatch(/t\("Per Jam".*?Hourly/);
    expect(projectForm).toContain("Retainer");
    const projectsAction = read("src/lib/actions/projects.ts");
    expect(projectsAction).toContain("retainerFee: parsed.retainerFee != null ? String(parsed.retainerFee) : null");
    expect(projectsAction).toContain('retainerPeriodUnit: parsed.billingModel === "retainer" ? "month" : null');
    expect(projectForm).not.toContain("selectedPackage?.hours");
    expect(timerWidget).toContain("startTimer({ workspaceId })");
    expect(timerWidget).toContain("await stopTimer(activeTimer.id)");
    expect(timerWidget).not.toContain("setStopDialogOpen(true)");
    expect(topbar).not.toContain("await startTimer({ workspaceId })");
    expect(topbar).toContain("await stopTimer(activeTimer.id)");
    expect(topbar).not.toContain('if (!activeTimer.projectId)');
  });

  it("keeps project dialogs reachable on mobile", () => {
    const createDialog = read("src/components/projects/project-create-dialog.tsx");
    const projectPage = read("src/components/projects/project-edit-dialog.tsx");
    const projectForm = read("src/components/forms/project-form.tsx");

    expect(createDialog).toContain('max-h-[90dvh]');
    expect(createDialog).toContain('overflow-y-auto');
    expect(projectPage).toContain('max-h-[90dvh]');
    expect(projectPage).toContain('overflow-y-auto');
    expect(projectForm).toContain('sm:grid-cols-2');
    expect(projectForm).toContain('<DialogClose asChild>');
    expect(projectForm).toContain('t("Batal", "Cancel")');
  });
});
