import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(app)/app/calendar/page.tsx", "utf8");

describe("calendar upcoming appointments empty state", () => {
  it("renders directly inside the outer card without a nested card shell", () => {
    expect(source).toMatch(/<EmptyState[\s\S]*?embedded[\s\S]*?\/>/);
  });
});
