import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const component = readFileSync("src/components/productivity/quick-capture-card.tsx", "utf8");
const page = readFileSync("src/app/(app)/app/productivity/page.tsx", "utf8");

describe("quick capture", () => {
  it("submits direct habit and goal mutations", () => {
    expect(component).toContain("submit(checkHabit, formData)");
    expect(component).toContain("submit(updateGoal, formData)");
    expect(component).toContain('role="status"');
    expect(component).toContain("selectedGoal?.nextStep");
    expect(component).toContain('lang: "id" | "en"');
    expect(page).toContain("lang={lang}");
    expect(page).not.toContain("updateGoal={quickUpdateGoal} t={t}");
    expect(page).toContain("togglePersonalHabitCheckin");
    expect(page).toContain("manualProgress: Number(formData.get(\"progress\"))");
    expect(page).toContain("togglePersonalGoalStep(step.id, true)");
  });
});
