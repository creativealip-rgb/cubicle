import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "src/components/prompts/prompt-studio.tsx"),
  "utf8",
);

describe("Prompt Studio mobile hierarchy", () => {
  it("uses compact labeled selectors on mobile", () => {
    expect(source).toContain('aria-label="Pilih kategori prompt"');
    expect(source).toContain('aria-label="Pilih jenis konten"');
    expect(source).toContain('className="grid gap-3 md:hidden"');
  });

  it("keeps visual category and content navigation on desktop", () => {
    expect(source).toContain('className="hidden gap-2 overflow-x-auto pb-2 md:flex"');
    expect(source).toContain('className="mt-3 hidden gap-2 md:grid md:grid-cols-2 lg:grid-cols-4"');
  });

  it("prioritizes brief before secondary guidance on mobile", () => {
    expect(source).toContain('className="rounded-2xl border bg-white p-3 sm:p-5"');
    expect(source).toContain('className="mb-3 sm:mb-4"');
    expect(source).toContain('className="space-y-3 sm:space-y-4"');
  });
});
