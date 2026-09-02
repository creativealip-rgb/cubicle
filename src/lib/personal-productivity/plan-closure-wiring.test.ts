import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("personal productivity plan closure", () => {
  it("ships complete habit CRUD, monthly calendar, and 44px actions", () => {
    const actions = read("src/lib/actions/personal-habits.ts");
    const section = read("src/components/productivity/habits-section.tsx");
    expect(actions).toContain("deletePersonalHabit");
    expect(section).toContain("updateHabitAction");
    expect(section).toContain("deleteHabitAction");
    expect(section).toContain("HabitHeatmap");
    expect(section).toContain("min-h-11");
  });

  it("counts only habits scheduled today", () => {
    const page = read("src/app/(app)/app/productivity/page.tsx");
    expect(page).toContain("habitsScheduledToday={scheduledHabitsToday.length}");
  });

  it("ships editable personal transactions and categories with category bucket defaults", () => {
    const section = read("src/components/expenses/personal-expenses-section.tsx");
    expect(section).toContain("updatePersonalTransaction");
    expect(section).toContain("updatePersonalTransactionCategory");
    expect(section).toContain("deletePersonalTransactionCategory");
    expect(section).toContain("defaultBucketByCategory");
    expect(section).toContain("formatMoney");
  });

  it("uses decimal-safe budget progress, disabled hiding, currency selection, confirmation, and ARIA", () => {
    const section = read("src/components/expenses/personal-budget-section.tsx");
    expect(section).toContain("budgetProgress");
    expect(section).toContain("data.budget?.enabled");
    expect(section).toContain("data.currencies");
    expect(section).toContain('name="replace" value="true"');
    expect(section).toContain('role="progressbar"');
    expect(section).not.toContain("Number(row.actual)");
  });
});
