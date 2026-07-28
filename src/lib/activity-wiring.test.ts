import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 2 Activity catalog wiring", () => {
  it("uses an additive tenant-safe schema and preserves uncategorized legacy entries", () => {
    const schema = read("src/db/schema.ts");
    const migration = read("drizzle/0048_activity_catalog.sql");

    expect(schema).toContain('export const activities = pgTable("activities"');
    expect(schema).toContain('export const projectActivities = pgTable("project_activities"');
    expect(schema).toContain('activityId: uuid("activity_id")');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "activities"');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "project_activities"');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "activity_id" uuid');
    expect(migration).toContain('FOREIGN KEY ("activity_id", "workspace_id")');
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).not.toMatch(/UPDATE\s+"?time_entries"?\s+SET\s+"?activity_id"?/i);
    expect(migration).toContain("lower(btrim(name))");
    expect(migration).toContain("WHERE status = 'active'");
  });

  it("scopes Activity CRUD to workspace and archives instead of deleting history", () => {
    const actions = read("src/lib/actions/activities.ts");

    expect(actions).toContain("assertWorkspaceWritable");
    expect(actions).toContain("eq(activities.workspaceId, workspaceId)");
    expect(actions).toContain('status: "archived"');
    expect(actions).not.toContain("db.delete(activities)");
    expect(actions).toContain("projectActivities");
    expect(actions).toContain("workspaceId");
  });

  it("enforces Activity selection on completion, manual creation, edit, and approval", () => {
    const time = read("src/lib/actions/time.ts");

    expect(time).toContain("activityId: z.string().uuid().optional().nullable()");
    expect(time).toContain('stage: "start"');
    expect(time).toContain('stage: "completion"');
    expect(time).toContain('stage: "manual"');
    expect(time).toContain('stage: "edit"');
    expect(time).toContain('stage: "approval"');
    expect(time).toContain("assertActivityWriteAllowed");
    expect(time).toContain("activityId: activityPolicy.activityId");
  });

  it("keeps timer form order Project, Activity, Related Task, Description", () => {
    for (const path of [
      "src/components/time/timer-widget.tsx",
      "src/components/time/manual-entry-form.tsx",
      "src/components/time/stop-timer-dialog.tsx",
    ]) {
      const source = read(path);
      const project = source.indexOf('t("Proyek", "Project")');
      const activity = source.indexOf('t("Activity", "Activity")');
      const task = source.indexOf('t("Tugas terkait", "Related Task")');
      const description = source.indexOf('t("Deskripsi", "Description")');
      expect(project, `${path}: Project label`).toBeGreaterThan(-1);
      expect(activity, `${path}: Activity label`).toBeGreaterThan(project);
      expect(task, `${path}: Related Task label`).toBeGreaterThan(activity);
      expect(description, `${path}: Description label`).toBeGreaterThan(task);
      expect(source).toContain("activityId");
    }
  });

  it("supports Project Activity enablement and clears invalid child selections", () => {
    const settings = read("src/components/projects/project-activity-settings.tsx");
    const timer = read("src/components/time/timer-widget.tsx");
    const manual = read("src/components/time/manual-entry-form.tsx");
    const stop = read("src/components/time/stop-timer-dialog.tsx");

    expect(settings).toContain("setProjectActivities");
    expect(settings).toContain("billableOverride");
    expect(settings).toContain("rateOverride");
    for (const source of [timer, manual, stop]) {
      expect(source).toContain("setActivityId(\"\")");
      expect(source).toContain("projectId");
    }
  });

  it("filters and groups by Activity while labeling legacy null rows", () => {
    const timesheet = read("src/components/time/timesheet.tsx");
    const timePage = read("src/app/(app)/app/time/page.tsx");
    const reports = read("src/app/(app)/app/reports/page.tsx");

    expect(timePage).toContain("activityName:");
    expect(timePage).toContain("activities.name");
    expect(timePage).toContain("activities={activityList}");
    expect(timesheet).toContain("activityFilter");
    expect(timesheet).toContain('t("Tanpa aktivitas", "No activity")');
    expect(reports).toContain("timeEntries.activityId");
    expect(reports).toContain("activities.name");
    expect(reports).toContain('t("Tanpa aktivitas", "No activity")');
  });

  it("exposes workspace Activity catalog from app navigation", () => {
    const page = read("src/app/(app)/app/activities/page.tsx");
    const navigation = read("src/lib/navigation/app-navigation.ts");

    expect(page).toContain("ActivityCatalog");
    expect(navigation).toContain('direct("activities", "/app/activities"');
  });
});
