import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const action = readFileSync("src/lib/actions/time.ts", "utf8");
const ui = readFileSync("src/components/time/timesheet.tsx", "utf8");
describe("time entry reuse", () => {
  it("supports restart and copy without writing generated duration", () => {
    expect(action).toContain("export async function restartTimeEntry");
    expect(action).toContain("export async function copyTimeEntry");
    expect(action).not.toContain("manualMinutes: source.durationMinutes ?? source.manualMinutes, durationMinutes:");
  });
  it("shows restart, copy, and edit detail actions", () => {
    expect(ui).toContain('t("Mulai lagi", "Start again")');
    expect(ui).toContain('t("Salin", "Copy")');
    expect(ui).toContain('t("Ubah detail", "Edit details")');
  });
});
