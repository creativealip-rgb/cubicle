import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const component = readFileSync("src/components/productivity/quick-capture-card.tsx", "utf8");
const page = readFileSync("src/app/(app)/app/productivity/page.tsx", "utf8");

describe("quick capture", () => {
  it("submits direct habit and goal mutations", () => {
    expect(component).toContain("action={checkHabit}");
    expect(component).toContain("action={updateGoal}");
    expect(page).toContain("togglePersonalHabitCheckin");
    expect(page).toContain("manualProgress: Number(formData.get(\"progress\"))");
  });
});
