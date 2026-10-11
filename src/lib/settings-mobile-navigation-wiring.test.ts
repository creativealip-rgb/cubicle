import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/components/settings/settings-tabs.tsx"), "utf8");

describe("settings mobile navigation", () => {
  it("uses a compact mobile section selector", () => {
    expect(source).toContain('aria-label={t("Bagian pengaturan", "Settings sections")}');
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("tabs.map((tab)");
  });

  it("keeps a comfortable touch target on the scrollable tab list", () => {
    // Desktop tabs keep a comfortable touch target (h-auto list, min-h-9 triggers).
    expect(source).toContain("h-auto min-h-9");
    expect(source).toContain('min-h-9');
  });

  it("keeps URL-synced tab changes", () => {
    expect(source).toContain("onValueChange={changeTab}");
    expect(source).toContain("router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })");
  });
});
