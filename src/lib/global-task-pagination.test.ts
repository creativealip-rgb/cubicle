import { describe, expect, it } from "vitest";
import fs from "node:fs";
const page = fs.readFileSync("src/app/(app)/app/tasks/page.tsx", "utf8");
describe("global Task pagination", () => {
  it("counts filtered rows and clamps pages", () => {
    expect(page).toContain("filteredTaskCount");
    // The paginated page count must be scoped to the filtered task rows, not a
    // bare COUNT(*) (subtask aggregates elsewhere legitimately use COUNT(*)).
    const countLine = page.split("\n").find((line) => line.includes("filteredTaskCount"));
    expect(countLine).toContain("count(${tasks.id})::int");
    expect(page).toContain("totalPages");
    expect(page).toContain("Math.min(requestedPage, totalPages)");
  });
  it("queries exactly ten with offset", () => {
    expect(page).toContain("(page - 1) * PAGE_SIZE");
    expect(page).toContain("PAGE_SIZE = 10");
  });
  it("renders previous next indicator and preserves params", () => {
    expect(page).toContain("Sebelumnya");
    expect(page).toContain("Berikutnya");
    expect(page).toContain("buildTaskPageHref");
    expect(page).toMatch(/t\("Halaman"/);
  });
});
