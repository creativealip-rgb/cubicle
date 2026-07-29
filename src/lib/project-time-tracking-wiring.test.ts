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

  it.skip("enforces legacy project mode across all entry points (superseded billing policy)", () => {
    const time = read("src/lib/actions/time.ts");
    expect(time).toContain("assertProjectTimeTrackingEnabled(db, parsed.workspaceId, parsed.projectId)");
    expect(time).toContain("assertProjectTimeTrackingEnabled(db, workspaceId, row.projectId)");
    expect(time).toContain("assertProjectTimeTrackingEnabled(db, workspaceId, nextProjectId)");
    expect(time).toContain("assertHistoricalTimeEntryMutable(db, workspaceId, entry.projectId)");
    expect(time).toContain("await assertProjectTimeTrackingEnabled(db, workspaceId, entry.projectId)");
    expect(time).toContain("Project wajib dipilih sebelum timer dihentikan");
    expect(time).toContain("timeEntryBillableForMode");

    const projectsAction = read("src/lib/actions/projects.ts");
    expect(projectsAction).toContain("const projectUpdateSchema = projectInputSchema.partial()");
    expect(projectsAction).toContain("const parsed = projectUpdateSchema.parse(input)");
    expect(projectsAction).not.toContain("projectSchema.partial().parse(input)");
  });

  it("keeps task title as context and never persists it as a new entry description", () => {
    const time = read("src/lib/actions/time.ts");
    const widget = read("src/components/time/timer-widget.tsx");
    const manual = read("src/components/time/manual-entry-form.tsx");
    const taskSheet = read("src/components/tasks/task-detail-sheet.tsx");

    expect(time).not.toContain("if ((!description || !description.trim()) && parsed.taskId)");
    expect(time).not.toContain("description: row.title");
    expect(widget).not.toContain("setDescription(task.title)");
    expect(manual).not.toContain("setDescription(task.title)");
    expect(taskSheet).toContain("Task sebagai konteks; deskripsi pekerjaan tetap terpisah");
  });

  it("filters off projects from write UI but keeps historical entries visible", () => {
    const page = read("src/components/time/time-route-content.tsx");
    const projectPage = read("src/app/(app)/app/projects/[projectId]/page.tsx");
    const taskSheet = read("src/components/tasks/task-detail-sheet.tsx");

    const timesheet = read("src/components/time/timesheet.tsx");

    expect(page).toContain("timeTrackingMode: projects.timeTrackingMode");
    expect(page).toContain("projectTimeTrackingMode: projects.timeTrackingMode");
    expect(page).toContain('filter((project) => project.timeTrackingMode !== "off")');
    expect(projectPage).toContain('project.timeTrackingMode !== "off"');
    expect(projectPage).toContain("projectTimeEntries.length > 0");
    expect(taskSheet).toContain("timeTrackingMode?:");
    expect(taskSheet).toContain('task.timeTrackingMode === "off"');
    expect(timesheet).toContain('entry.projectTimeTrackingMode === "off"');
    expect(timesheet).toContain('t("Hanya baca", "Read only")');
  });

  it.skip("keeps legacy empty-timer completion aligned with server policy (topbar now stops directly)", () => {
    const projectForm = read("src/components/forms/project-form.tsx");
    const timerWidget = read("src/components/time/timer-widget.tsx");
    const topbar = read("src/components/app-topbar.tsx");

    expect(projectForm).toContain('defaultValues?.billingType==="hours"?"hourly":"fixed_price"');
    expect(projectForm).toContain('<SelectItem value="fixed_price">Harga Tetap</SelectItem>');
    expect(projectForm).toContain('<SelectItem value="hourly">Per Jam</SelectItem>');
    expect(projectForm).not.toContain("selectedPackage?.hours");
    expect(timerWidget).toContain("<StopTimerDialog");
    expect(timerWidget).toContain("open={stopDialogOpen}");
    expect(topbar).toContain('if (!activeTimer.projectId)');
    expect(topbar).toContain('router.push("/app/time")');
  });

  it("keeps project dialogs reachable on mobile", () => {
    const createDialog = read("src/components/projects/project-create-dialog.tsx");
    const projectPage = read("src/app/(app)/app/projects/[projectId]/page.tsx");
    const projectForm = read("src/components/forms/project-form.tsx");

    expect(createDialog).toContain('max-h-[90dvh]');
    expect(createDialog).toContain('overflow-y-auto');
    expect(projectPage).toContain('max-h-[90dvh]');
    expect(projectPage).toContain('overflow-y-auto');
    expect(projectForm).toContain('sm:grid-cols-2');
    expect(projectForm).toContain('<DialogClose asChild>');
    expect(projectForm).toContain('>Batal</Button>');
  });
});
