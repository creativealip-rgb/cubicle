import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("MH2 weekly timesheet approval wiring", () => {
  it("defines additive submission schema and migration", () => {
    const schema = read("src/db/schema.ts");
    const migration = read("drizzle/0051_timesheet_approval.sql");
    expect(schema).toContain("export const timesheetSubmissions");
    expect(schema).toContain('enum: ["submitted", "approved", "rejected"]');
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS timesheet_submissions");
    expect(migration).toContain("timesheet_submissions_workspace_user_week_unique");
  });

  it("provides submit and owner review actions", () => {
    const actions = read("src/lib/actions/timesheet-approval.ts");
    expect(actions).toContain("export async function submitWeeklyTimesheet");
    expect(actions).toContain("export async function reviewWeeklyTimesheet");
    expect(actions).toContain("assertWorkspaceOwner");
    expect(actions).toContain('decision: z.enum(["approved", "rejected"])');
  });

  it("guards all time mutations when week is submitted or approved", () => {
    const guard = read("src/lib/timesheet-approval.ts");
    const actions = read("src/lib/actions/time.ts");
    expect(guard).toContain("assertTimesheetWeekMutable");
    expect(actions).toContain("assertTimesheetWeekMutable");
    expect(actions).toContain('entry.status === "approved"');
  });

  it("renders submit and owner review controls", () => {
    const component = read("src/components/time/timesheet-approval-panel.tsx");
    const page = read("src/components/time/time-route-content.tsx");
    expect(component).toContain("Kirim timesheet");
    expect(component).toContain("Setujui");
    expect(component).toContain("Tolak");
    expect(page).toContain("TimesheetApprovalPanel");
  });
});
