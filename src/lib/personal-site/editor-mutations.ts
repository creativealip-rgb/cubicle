import { emptySection, type PersonalSitePage, type PersonalSiteSection } from "./model";

/**
 * Client-side mirror of the Zod caps in `model.ts` (`sections: … .max(12)`,
 * `pages: … .max(10)`). Single source of truth for the editor so over-limit
 * documents never reach save. Keep in sync with `personalSiteInputSchema`.
 */
export const MAX_SECTIONS = 12;
export const MAX_PAGES = 10;

/** contentBlock `columns` / `items` are 1:1; schema allows 2–4 columns. */
export const CONTENT_BLOCK_COLUMNS_MIN = 2;
export const CONTENT_BLOCK_COLUMNS_MAX = 4;

/**
 * Append a section. No-op (same reference) at the schema cap so React state
 * does not churn when a widget is added to a full page.
 */
export function addSection(sections: PersonalSiteSection[], section: PersonalSiteSection): PersonalSiteSection[] {
  if (sections.length >= MAX_SECTIONS) return sections;
  return [...sections, section];
}

/**
 * Deep-clone `id` and insert the copy immediately after the original with a
 * fresh id and a "(copy)" heading. `createId` keeps this pure and testable.
 */
export function duplicateSection(
  sections: PersonalSiteSection[],
  id: string,
  createId: () => string,
): PersonalSiteSection[] {
  if (sections.length >= MAX_SECTIONS) return sections;
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) return sections;
  const original = sections[index];
  const copy = {
    ...structuredClone(original),
    id: createId(),
    heading: `${original.heading} (copy)`,
  } as PersonalSiteSection;
  const next = [...sections];
  next.splice(index + 1, 0, copy);
  return next;
}

/** Remove a section. No-op (same reference) for unknown ids. */
export function removeSection(sections: PersonalSiteSection[], id: string): PersonalSiteSection[] {
  if (!sections.some((section) => section.id === id)) return sections;
  return sections.filter((section) => section.id !== id);
}

/**
 * Drag reorder: move the `activeId` section to the array index currently held
 * by `overId`. No-op (same reference) when either id is unknown or unchanged.
 */
export function moveSection(
  sections: PersonalSiteSection[],
  activeId: string,
  overId: string,
): PersonalSiteSection[] {
  const from = sections.findIndex((section) => section.id === activeId);
  const to = sections.findIndex((section) => section.id === overId);
  if (from < 0 || to < 0 || from === to) return sections;
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Up/down button reorder: move `id` by `delta` positions (±1 for adjacent
 * swap). No-op (same reference) for unknown ids, `delta === 0`, or out of range.
 */
export function moveSectionByOffset(
  sections: PersonalSiteSection[],
  id: string,
  delta: number,
): PersonalSiteSection[] {
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0 || delta === 0) return sections;
  const target = index + delta;
  if (target < 0 || target >= sections.length) return sections;
  const next = [...sections];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/**
 * Keep a contentBlock's item count equal to its `columns` (schema requires
 * 2–4). Pads with empty cells or truncates; clamps `columns` into range.
 * Returns the same reference when already consistent, and passes any other
 * section type through untouched (gallery `columns` is grid width, not a
 * 1:1 item count).
 */
export function normalizeContentBlock(section: PersonalSiteSection): PersonalSiteSection {
  if (section.type !== "contentBlock") return section;
  const columns = Math.min(
    CONTENT_BLOCK_COLUMNS_MAX,
    Math.max(CONTENT_BLOCK_COLUMNS_MIN, section.columns),
  );
  const items = section.items.slice(0, columns);
  const next = [...items];
  for (let i = items.length; i < columns; i += 1) {
    next.push({ id: `${section.id}__col${i + 1}`, content: "" });
  }
  if (columns === section.columns && next.length === section.items.length) return section;
  return { ...section, columns, items: next };
}

/** Append a page. No-op (same reference) at the schema cap. */
export function addPage(pages: PersonalSitePage[], page: PersonalSitePage): PersonalSitePage[] {
  if (pages.length >= MAX_PAGES) return pages;
  return [...pages, page];
}

/** Remove a page. No-op (same reference) for unknown ids. */
export function removePage(pages: PersonalSitePage[], id: string): PersonalSitePage[] {
  if (!pages.some((page) => page.id === id)) return pages;
  return pages.filter((page) => page.id !== id);
}

/**
 * True when a section is still exactly what `emptySection(type)` produces,
 * ignoring every `id` (section id and array element ids alike). Deleting such a
 * section is safe to do without the confirmation prompt.
 *
 * Structural comparison is used instead of an ignore-list of "non-content"
 * string keys because each type stores user text under different fields and
 * carries different defaults: booking's prefilled `heading`/`subtitle` are
 * placeholders (not user content) while services' item `title` is user text.
 * An ignore-list has to know, per type, which fields are defaults — that is
 * exactly the assumption that made a fresh booking section read as non-empty.
 * "Equal to the pristine default" needs no such knowledge.
 */
export function isSectionEmpty(section: PersonalSiteSection): boolean {
  return sameIgnoringIds(section, emptySection(section.type));
}

/** Deep equality that skips every `id` key (objects and array elements). */
function sameIgnoringIds(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => sameIgnoringIds(item, b[index]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as Record<string, unknown>).filter((key) => key !== "id");
    const bKeys = Object.keys(b as Record<string, unknown>).filter((key) => key !== "id");
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      sameIgnoringIds(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }
  return false;
}
