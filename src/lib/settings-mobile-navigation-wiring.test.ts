import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/components/settings/settings-tabs.tsx"), "utf8");

describe("settings mobile navigation", () => {
  it("uses a compact mobile section selector", () => {
    expect(source).toContain('aria-label={t("Pilih bagian pengaturan", "Choose settings section")}');
    expect(source).toContain('className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium');
    expect(source).toContain("tabs.find((tab) => tab.key === activeTab)");
  });

  it("keeps full tab navigation for desktop only", () => {
    expect(source).toContain('className="hidden md:block"');
    // Desktop tabs keep a comfortable touch target (h-auto list, min-h-9 triggers).
    expect(source).toContain('min-h-9');
  });

  it("keeps URL-synced tab changes", () => {
    expect(source).toContain("onValueChange={changeTab}");
    expect(source).toContain("router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })");
  });
});
