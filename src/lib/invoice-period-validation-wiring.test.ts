import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source=readFileSync("src/components/forms/invoice-form.tsx","utf8");
describe("timesheet period validation UX",()=>{
 it("labels required period fields",()=>{expect(source).toContain('htmlFor={`period-start-${project.id}`}');expect(source).toContain('id={`period-start-${project.id}`}');expect(source).toContain('aria-invalid={Boolean(periodError)}');});
 it("shows inline error and disables submit",()=>{expect(source).toContain('const incompleteTimesheetPeriods');expect(source).toContain('Lengkapi periode timesheet');expect(source).toContain('disabled={loading || incompleteTimesheetPeriods}');});
});
