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
  });

  it("keeps visual category and content navigation on desktop", () => {
    // Desktop-only block: category dropdown + horizontal type pill row
    expect(source).toContain('className="hidden md:flex flex-col gap-2"');
    expect(source).toContain(
      'className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5"',
    );
    expect(source).toContain(
      'typeId === item.id',
    );
    expect(source).toContain(
      '{lang === "en" && selected.descriptionEn ? selected.descriptionEn : selected.description}',
    );
  });

  it("prioritizes brief before secondary guidance on mobile", () => {
    // DOM order on mobile: compact selector section -> brief form -> result panel
    const selectorSection = source.indexOf(
      'id="prompt-category-mobile"',
    );
    const briefSection = source.indexOf('id="prompt-brief"');
    const resultPanel = source.indexOf("Live Output / Result Area");
    expect(selectorSection).toBeGreaterThan(-1);
    expect(briefSection).toBeGreaterThan(selectorSection);
    expect(resultPanel).toBeGreaterThan(briefSection);
  });
});
