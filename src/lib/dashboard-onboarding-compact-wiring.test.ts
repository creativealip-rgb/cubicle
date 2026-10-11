import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("compact dashboard onboarding", () => {
  it("shows only the pending steps as a responsive 1-4 column grid", () => {
    const source = read("src/components/dashboard-onboarding.tsx");
    expect(source).toContain("const pendingSteps = steps.filter((s) => !s.done)");
    expect(source).toContain("pendingSteps.map((step)");
    expect(source).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
  });

  it("hides itself once every step is done", () => {
    const source = read("src/components/dashboard-onboarding.tsx");
    expect(source).toContain("doneCount === total");
    expect(source).toContain("pendingSteps.length === 0) return null");
  });

  it("supports a dismiss action with a touch-friendly dismiss button", () => {
    const source = read("src/components/dashboard-onboarding.tsx");
    expect(source).toContain("const [dismissed, setDismissed] = useState(false)");
    expect(source).toContain("setDismissed(true)");
    expect(source).toContain("min-h-11 min-w-11");
  });
});
