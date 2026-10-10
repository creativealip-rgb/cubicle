# Landing canvas — Forms parity plan (addendum)

Tasks 6b and 6c were discovered while implementing Task 6. Both are release
blockers for "every Landing section property editable" and both pre-date this
plan — they are pre-existing gaps exposed by the 20-type parity audit.

## Task 6b: Make every block type savable (split storage schema from publish readiness)

**Severity:** critical. Found by a parent probe, reproduced against the real
schema (`personalSiteInputSchema.safeParse`).

**Objective:** A freshly added block must save. Eight of the twenty block types
currently fail Zod validation in their pristine state, so the save action
(`src/lib/actions/personal-site.ts:118`) returns
`status: "error"` / `"Periksa kembali field yang ditandai."` and nothing is
persisted. The user sees a generic error pointing at fields inside an item row
they have not filled in yet.

**Verified failing types** (`emptySection(type)` → first item's required string):

| type | offending field |
|------|-----------------|
| services | `items[0].title` |
| process | `steps[0].title` |
| pricing | `offers[0].name` |
| portfolio | `projects[0].title` |
| testimonials | `testimonials[0].quote` |
| faq | `items[0].question`, `items[0].answer` |
| contact | `methods[0].label` |
| collapsible | `items[0].title`, `items[0].content` |

**Root cause:** the storage schema enforces content completeness via `.min(1)`
on item fields, while the editor legitimately creates blank item rows and
`src/lib/personal-site/readiness.ts` already owns the publish gate.

**Steps:**
1. Write the failing test first: for every `PersonalSiteSection["type"]`, a site
   holding a fresh `emptySection(type)` must parse through
   `personalSiteInputSchema`. Use an exhaustive type list so a new type cannot
   escape coverage.
2. Relax the eight item-content constraints to `.max(N)` (drop `.min(1)`), so
   in-progress drafts persist. Keep every `.max()` bound and every structural
   requirement — this is a completeness relaxation, not a shape relaxation.
3. Compensate in readiness: publishing must still require the content the schema
   used to enforce. Add a readiness error per block that has a required-but-empty
   item, and prove `isReadyToPublish` is false for a site containing one.

4. Verify the public renderer tolerates empty item strings (no "undefined", no
   dangling separators) for all eight types.
5. Commit: `fix(site): let freshly added blocks save`.

**Resolution — severity is per block type, not uniform.** A blanket `error` was
wrong: only the eight types above ever had their blank content rejected by the
storage schema, so only those are guaranteed absent from an already-published
site. The rest were always savable while empty, so erroring on them would newly
block sites that publish fine today. `EMPTY_BLOCK_SEVERITY` in `readiness.ts` is
an exhaustive `Record` over the section-type union (a new type fails `tsc` until
classified):

- `error` — services, process, pricing, portfolio, testimonials, faq, contact,
  collapsible, booking. (Booking counts because its only content *is* the
  heading, which the schema required.)
- `warning` — image, gallery, embed, custom, mediaText, cta, social, contentBlock.
- `never` — divider, spacer, tableOfContents (`sectionHasContent` is true by design).

Two follow-ups landed with it. `headingSchema` lost its `.min(1)` for the same
reason: the heading is clearable in the panel and the public renderer already
hides an empty or default heading, so requiring one blocked the whole save. And
the empty-block label now carries an ordinal, plus the page title when a site has
more than one page, so several empty blocks are distinguishable.

**Do not** solve this by seeding placeholder text into `emptySection` — that
would publish invented copy to a user's public site.

## Task 6c: Add editors for the block types that have none

**Objective:** Five block types expose no editor on desktop OR mobile, so their
properties cannot be edited anywhere. Task 6 achieved mobile↔desktop parity,
but parity with "nothing" is not parity (`modal`-free but empty).

**Missing editors** (`PropertiesContent` renders editors for only 13 of 20 types,
`src/components/site/canvas/properties-panel.tsx:332-344`):

| type | schema fields needing controls |
|------|-------------------------------|
| embed | `url` (required, max 2000), `height` (100–800, default 400) |
| social | `links[]` (`platform` max 40, `url` max 2000), max 10 |
| collapsible | `items[]` (`title` min 1 max 200, `content` min 1 max 2000), max 12 |
| spacer | `height` (16–200, default 40) |
| contentBlock | `columns` (2–4), `layout` (`equal`/`left-heavy`/`right-heavy`/`thirds`), `items[].content` max 4 |

`divider` and `tableOfContents` carry no content fields — heading/animation only
is correct for them; record that as intentional, not missing.

**Steps:**
1. Extend the parity table test: remove the `null` markers for the five types
   above and assert a real control per type. Leave `divider` and
   `tableOfContents` explicitly marked as no-content-fields.
2. Add the five editors, following the existing editor components' shape.
3. Respect item caps using the shared limits, with a bilingual toast on a
   blocked add (same pattern as Task 5).
4. No typography controls in the panel — inline toolbar only.
5. Commit: `feat(site): add missing block editors`.
