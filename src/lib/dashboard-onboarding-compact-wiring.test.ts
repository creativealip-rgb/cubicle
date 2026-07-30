import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("compact dashboard onboarding", () => {
  it("shows at most three next incomplete actions by default", () => {
    const source = read("src/components/dashboard-onboarding.tsx");
    expect(source).toContain("const pendingSteps = steps.filter((step) => !step.done)");
    expect(source).toContain("const visibleSteps = expanded ? pendingSteps : pendingSteps.slice(0, 3)");
    expect(source).toContain("visibleSteps.map((step)");
  });

  it("lets users expand and collapse remaining actions", () => {
    const source = read("src/components/dashboard-onboarding.tsx");
    expect(source).toContain("const [expanded, setExpanded] = useState(false)");
    expect(source).toContain("setExpanded((value) => !value)");
    expect(source).toContain('t(`Lihat ${pendingSteps.length - 3} langkah lagi`');
    expect(source).toContain('t("Ringkas langkah"');
  });

  it("uses a single compact column instead of the old two-column checklist", () => {
    const source = read("src/components/dashboard-onboarding.tsx");
    expect(source).toContain('className="mt-4 space-y-2"');
    expect(source).not.toContain("sm:grid-cols-2");
  });
});
