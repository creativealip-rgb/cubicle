import { describe, expect, it } from "vitest";
import { DEFAULT_PERSONAL_SITE, personalSiteInputSchema, type PersonalSitePage, type PersonalSiteSection } from "./model";
import {
  MAX_PAGES,
  MAX_SECTIONS,
  addPage,
  addSection,
  duplicateSection,
  moveSection,
  moveSectionByOffset,
  normalizeContentBlock,
  removePage,
  removeSection,
} from "./editor-mutations";

function section(id: string, overrides: Partial<PersonalSiteSection> = {}): PersonalSiteSection {
  return { id, type: "custom", heading: `Section ${id}`, content: "", ...overrides } as PersonalSiteSection;
}

function page(id: string, overrides: Partial<PersonalSitePage> = {}): PersonalSitePage {
  return { id, slug: id, title: id, isHome: false, sections: [], ...overrides };
}

describe("MAX_* limits match the Zod schema", () => {
  const sectionsOf = (count: number) => Array.from({ length: count }, (_, i) => section(`s${i}`));
  const pagesOf = (count: number) =>
    Array.from({ length: count }, (_, i) => page(`p${i}`, { isHome: i === 0, sections: [section(`p${i}-s`)] }));

  it("uses exactly the schema's section cap", () => {
    expect(personalSiteInputSchema.safeParse({ ...DEFAULT_PERSONAL_SITE, sections: sectionsOf(MAX_SECTIONS) }).success).toBe(true);
    expect(personalSiteInputSchema.safeParse({ ...DEFAULT_PERSONAL_SITE, sections: sectionsOf(MAX_SECTIONS + 1) }).success).toBe(false);
  });

  it("uses exactly the schema's page cap", () => {
    expect(personalSiteInputSchema.safeParse({ ...DEFAULT_PERSONAL_SITE, pages: pagesOf(MAX_PAGES) }).success).toBe(true);
    expect(personalSiteInputSchema.safeParse({ ...DEFAULT_PERSONAL_SITE, pages: pagesOf(MAX_PAGES + 1) }).success).toBe(false);
  });
});

describe("addSection", () => {
  it("appends a new section without mutating the input", () => {
    const input = [section("a")];
    const next = addSection(input, section("b"));
    expect(next).toHaveLength(2);
    expect(next[1].id).toBe("b");
    expect(input).toHaveLength(1);
    expect(next).not.toBe(input);
  });

  it("is a no-op once the 12-section boundary is reached", () => {
    const full = Array.from({ length: MAX_SECTIONS }, (_, i) => section(`s${i}`));
    const next = addSection(full, section("overflow"));
    expect(next).toBe(full);
    expect(next).toHaveLength(MAX_SECTIONS);
  });
});

describe("duplicateSection", () => {
  it("inserts the copy immediately after the original with a fresh id", () => {
    const input = [section("a"), section("b")];
    let n = 0;
    const next = duplicateSection(input, "a", () => `new-${n++}`);
    expect(next.map((s) => s.id)).toEqual(["a", "new-0", "b"]);
    expect(next[1].heading).toBe("Section a (copy)");
    expect(input.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("deep-clones the original so nested block content is not shared", () => {
    type Item = { id: string; title: string };
    type WithItems = { items: Item[] };
    const original = {
      id: "a",
      type: "services",
      heading: "Services",
      items: [{ id: "i1", title: "One" }],
    } as unknown as PersonalSiteSection;
    const originalItems = (original as unknown as WithItems).items;

    const next = duplicateSection([original], "a", () => "copy");
    const copy = next[1] as unknown as WithItems;

    expect(copy).not.toBe(original as unknown as WithItems);
    expect(copy.items).not.toBe(originalItems);
    expect(copy.items[0]).not.toBe(originalItems[0]);

    // A shallow clone would let this mutation leak into the original.
    copy.items[0].title = "Mutated";
    expect(originalItems[0].title).toBe("One");
    expect(next[1].id).toBe("copy");
    expect(next[1].heading).toBe("Services (copy)");
  });

  it("is a no-op for an unknown id", () => {
    const input = [section("a")];
    expect(duplicateSection(input, "nope", () => "copy")).toBe(input);
  });

  it("is a no-op at the section cap", () => {
    const full = Array.from({ length: MAX_SECTIONS }, (_, i) => section(`s${i}`));
    expect(duplicateSection(full, "s0", () => "copy")).toBe(full);
  });
});

describe("removeSection", () => {
  it("drops the section and returns a new array", () => {
    const input = [section("a"), section("b")];
    const next = removeSection(input, "a");
    expect(next.map((s) => s.id)).toEqual(["b"]);
    expect(input).toHaveLength(2);
  });

  it("is a no-op for an unknown id", () => {
    const input = [section("a")];
    expect(removeSection(input, "missing")).toBe(input);
  });
});

describe("moveSection (drag reorder)", () => {
  it("moves the active section onto the over index", () => {
    const input = [section("a"), section("b"), section("c")];
    expect(moveSection(input, "a", "c").map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(input.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("is a no-op when the target is unknown or unchanged", () => {
    const input = [section("a"), section("b")];
    expect(moveSection(input, "a", "nope")).toBe(input);
    expect(moveSection(input, "nope", "a")).toBe(input);
    expect(moveSection(input, "a", "a")).toBe(input);
  });
});

describe("moveSectionByOffset (up/down buttons)", () => {
  it("swaps with the neighbour in the requested direction", () => {
    const input = [section("a"), section("b"), section("c")];
    expect(moveSectionByOffset(input, "b", -1).map((s) => s.id)).toEqual(["b", "a", "c"]);
    expect(moveSectionByOffset(input, "b", 1).map((s) => s.id)).toEqual(["a", "c", "b"]);
    expect(input.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("is a no-op out of range or for unknown ids", () => {
    const input = [section("a"), section("b")];
    expect(moveSectionByOffset(input, "a", -1)).toBe(input);
    expect(moveSectionByOffset(input, "b", 1)).toBe(input);
    expect(moveSectionByOffset(input, "a", 0)).toBe(input);
    expect(moveSectionByOffset(input, "nope", 1)).toBe(input);
  });
});

describe("normalizeContentBlock", () => {
  const block = (columns: number, itemCount: number): PersonalSiteSection =>
    section("cb", {
      type: "contentBlock",
      columns,
      layout: "equal",
      items: Array.from({ length: itemCount }, (_, i) => ({ id: `i${i}`, content: `c${i}` })),
    } as Partial<PersonalSiteSection>);

  it("pads items up to the column count", () => {
    const next = normalizeContentBlock(block(3, 1));
    expect(next.type).toBe("contentBlock");
    if (next.type !== "contentBlock") return;
    expect(next.items).toHaveLength(3);
    expect(next.columns).toBe(3);
    expect(next.items[2].content).toBe("");
  });

  it("truncates items down to the column count", () => {
    const next = normalizeContentBlock(block(2, 4));
    if (next.type !== "contentBlock") throw new Error("expected contentBlock");
    expect(next.items).toHaveLength(2);
  });

  it("clamps columns into the schema range", () => {
    const low = normalizeContentBlock(block(1, 1));
    if (low.type !== "contentBlock") throw new Error("expected contentBlock");
    expect(low.columns).toBe(2);
    expect(low.items).toHaveLength(2);
    const high = normalizeContentBlock(block(9, 2));
    if (high.type !== "contentBlock") throw new Error("expected contentBlock");
    expect(high.columns).toBe(4);
    expect(high.items).toHaveLength(4);
  });

  it("returns the same reference when already consistent and leaves other types alone", () => {
    const consistent = block(2, 2);
    expect(normalizeContentBlock(consistent)).toBe(consistent);
    const custom = section("c");
    expect(normalizeContentBlock(custom)).toBe(custom);
  });
});

describe("addPage / removePage", () => {
  it("appends a page and is a no-op at the 10-page boundary", () => {
    const input = [page("home", { isHome: true })];
    const next = addPage(input, page("p2"));
    expect(next.map((p) => p.id)).toEqual(["home", "p2"]);
    expect(input).toHaveLength(1);

    const full = Array.from({ length: MAX_PAGES }, (_, i) => page(`p${i}`));
    expect(addPage(full, page("overflow"))).toBe(full);
  });

  it("removes a page and no-ops for unknown ids", () => {
    const input = [page("home", { isHome: true }), page("p2")];
    expect(removePage(input, "p2").map((p) => p.id)).toEqual(["home"]);
    expect(input).toHaveLength(2);
    expect(removePage(input, "nope")).toBe(input);
  });
});
