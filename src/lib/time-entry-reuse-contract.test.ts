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
  it("keeps timesheet rows free of redundant action buttons", () => {
    expect(ui).not.toContain("handleReuse(entry");
    expect(ui).not.toContain('aria-label={t("Mulai lagi", "Start again")}');
    expect(ui).not.toContain('aria-label={t("Salin", "Copy")}');
    expect(ui).not.toContain('aria-label={t("Ubah detail", "Edit details")}');
  });
});
