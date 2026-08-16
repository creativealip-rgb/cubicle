import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "src/components/prompts/prompt-studio.tsx"),
  "utf8",
);

describe("Prompt Studio mobile hierarchy", () => {
  it("uses compact labeled selectors on mobile", () => {
    // Mobile-only two-column grid holding category + type selects
    expect(source).toContain('className="grid gap-2 sm:grid-cols-2 md:hidden"');
    // Native selects are labeled via htmlFor/id pairs
    expect(source).toContain('htmlFor="prompt-category-mobile"');
    expect(source).toContain('id="prompt-category-mobile"');
    expect(source).toContain('htmlFor="prompt-type-mobile"');
    expect(source).toContain('id="prompt-type-mobile"');
    expect(source).toContain('t("Kategori", "Category")');
    expect(source).toContain('t("Jenis", "Type")');
    // Compact full-width select styling
    expect(source).toContain(
      'className="h-10 w-full rounded-lg border bg-background px-3 text-sm"',
    );
  });

  it("keeps visual category and content navigation on desktop", () => {
    // Desktop-only block: category dropdown + horizontal type pill row
    expect(source).toContain('className="hidden md:block"');
    expect(source).toContain(
      'className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5"',
    );
    // Compact pill buttons with a highlighted active state
    expect(source).toContain(
      "h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    );
    expect(source).toContain(
      'typeId === item.id ? "bg-primary text-primary-foreground"',
    );
    // Selected type description stays visible under the pill row (bilingual)
    expect(source).toContain(
      'className="mt-1.5 text-[11px] text-muted-foreground">{lang === "en" && selected.descriptionEn ? selected.descriptionEn : selected.description}',
    );
  });

  it("prioritizes brief before secondary guidance on mobile", () => {
    // DOM order on mobile: compact selector section -> brief form -> result panel
    const selectorSection = source.indexOf(
      'className="rounded-2xl border bg-white p-3 sm:p-4"',
    );
    const briefSection = source.indexOf('id="prompt-brief"');
    const resultPanel = source.indexOf("Right panel: result");
    expect(selectorSection).toBeGreaterThan(-1);
    expect(briefSection).toBeGreaterThan(selectorSection);
    expect(resultPanel).toBeGreaterThan(briefSection);
    // Brief header and body structure (bilingual name)
    expect(source).toContain('className="mb-3 sm:mb-4"');
    expect(source).toContain('Brief {lang === "en" && selected.nameEn ? selected.nameEn : selected.name}');
    expect(source).toContain('className="space-y-3 sm:space-y-4"');
  });
});
