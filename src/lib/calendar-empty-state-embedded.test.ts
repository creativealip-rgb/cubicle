import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(app)/app/calendar/page.tsx", "utf8");
const panel = readFileSync("src/components/calendar/appointments-list-panel.tsx", "utf8");

describe("calendar upcoming appointments empty state", () => {
  it("renders directly inside the outer card without a nested card shell", () => {
    // Page owns the single outer Card; the list panel renders the embedded EmptyState.
    expect(source).toContain('<AppointmentsListPanel');
    expect(panel).toMatch(/<EmptyState[\s\S]*?embedded[\s\S]*?\/>/);
  });
});
