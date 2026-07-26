import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/app/calendar/page.tsx", "utf8");

describe("calendar upcoming empty state", () => {
  it("centers empty content vertically and horizontally", () => {
    const start = page.indexOf("upcoming.length === 0");
    const emptyState = page.slice(start, page.indexOf("upcoming.map", start));
    expect(emptyState).toContain("flex");
    expect(emptyState).toContain("items-center");
    expect(emptyState).toContain("justify-center");
    expect(emptyState).toContain("min-h-[20rem]");
    expect(page).toContain('className="flex h-full flex-col lg:col-span-2"');
    expect(page).toContain('className="flex flex-1 flex-col space-y-3"');
  });
});
