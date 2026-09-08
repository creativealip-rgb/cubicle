import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const form = readFileSync("src/components/forms/invoice-form.tsx", "utf8");

describe("invoice client searchable picker", () => {
  it("opens on click, searches clients, and uses portaled popover", () => {
    expect(form).toContain("clientSearchOpen");
    expect(form).toContain("clientSearch");
    expect(form).toContain("<PopoverAnchor asChild>");
    expect(form).toContain('t("Cari klien", "Search client")');
    expect(form).toContain("filteredClients.map");
    expect(form).toContain("setClientSearchOpen(true)");
  });

  it("shows consistent chevron and readable rows", () => {
    expect(form).toContain("<ChevronDown");
    expect(form).toContain("min-h-10");
    expect(form).toContain("text-sm");
  });
});
