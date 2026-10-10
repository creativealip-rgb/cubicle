# Landing Page Canvas — Forms-Parity Design

Date: 2026-10-10
Status: Proposed for implementation
Scope: `/app/personal-site` canvas editor

## Goal

Make Landing Page builder use same interaction model, geometry, responsive behavior, and visual language as Forms builder while preserving Landing-specific blocks, SEO, pages, preview, and publishing.

## Product decision

Forms builder becomes canonical editor shell.

Shared behavior:

- Header workflow: BUILD / SETTINGS / PUBLISH.
- Left rail: Elements / Structure.
- Center canvas: page frame, selected block state, viewport preview.
- Right rail: selected block properties; text styling remains inline only.
- Shared floating toolbar geometry, focus retention, viewport collision handling, and responsive wrapping.
- Same spacing, borders, panel widths, scroll behavior, selection ring, drag handles, action controls, and empty states.
- Same desktop/mobile mental model. Mobile uses drawers/steps for space, but retains full editing capability.

Landing-specific behavior retained:

- 20 Landing section types and ready-made patterns.
- Multi-page site management.
- Theme, global typography, SEO, readiness, slug, sharing, QR, embed, publish/unpublish.
- Landing renderer and public routes.

Forms-specific field semantics do not leak into Landing.

## Architecture

### 1. Shared editor shell

Extract shell primitives from Forms and Landing into small reusable components:

- `BuilderWorkflowHeader`
- `BuilderLeftRail`
- `BuilderCanvasViewport`
- `BuilderPropertiesRail`
- `BuilderMobileDrawer`
- `BuilderSelectionActions`

Each receives content slots and state callbacks. No generic block schema or factory. Forms keeps field state; Landing keeps section state.

### 2. Landing selection contract

Canonical state:

- `activePageId`
- `selectedSectionId`
- optional selected nested text/item identity
- active viewport device
- open rail/drawer

Selection rules:

- Click section selects section.
- Click editable text selects nested text without losing section selection.
- Escape clears nested selection, then section selection.
- Switching page clears stale selection.
- Properties rail always resolves against active page.

### 3. Canvas behavior

- Canvas owns vertical scrolling.
- Sidebars own independent vertical scrolling.
- Floating toolbar uses viewport-fixed positioning and collision correction.
- Dropdown direction uses measured available space, not fixed `bottom-full`.
- Desktop canvas supports section DnD and visible drop indicator.
- Structure tree and canvas share one reorder function.
- Preview mode disables mutation affordances and link interception.

### 4. Mobile parity

Replace current limited mobile section step with full editor flow:

1. Elements drawer.
2. Canvas.
3. Selected section properties drawer.
4. Inline text toolbar, horizontally scrollable/wrapping within viewport.
5. Structure drawer with reorder, duplicate, delete.
6. Theme/settings/publish retain current workflow.

Mobile must edit every section property available on desktop. Controls may move into drawers; capability may not disappear.

### 5. Text styling

Inline toolbar is sole per-element typography editor:

- style role
- 12 fonts
- size
- bold/italic/underline/strikethrough
- text color
- link
- emoji
- alignment
- ordered/unordered list

Right properties rail keeps content fields, media, layout, transition, item CRUD, URLs, and section-level settings. No duplicate font/size/B/I/U/S/alignment controls.

Global heading/body font remains in Style because it controls theme defaults, not selected text.

## Reliability fixes included

### P0

- Full mobile content/property editing parity.
- Mobile publish/unpublish calls explicit persistence path; no delayed local-only toggle.
- Preserve current publication status during ordinary autosave.
- Scope document undo/redo shortcuts away from inputs, textareas, and contenteditable text editing.

### P1

- One reorder function for canvas and Structure panel.
- Delete confirmation for non-empty section; immediate undo affordance after deletion.
- Duplicate action on mobile.
- Enforce 12 sections and 10 pages before local insertion.
- Normalize `contentBlock.items` when column count changes.
- Apply safe URL validation to every link/embed/image URL field.
- Require alt text or explicit Decorative toggle for content images.
- Render CTA/social links accurately in preview mode.
- Return actionable field errors and focus invalid block/property.
- Add server revision token to prevent stale-tab autosave overwrite.
- Retry transient autosave failure with visible `Saving / Saved / Retry` state.

### P2

- Durable revision snapshots and restore UI.
- Breakpoint-specific visibility/layout overrides after shell parity is stable.
- Structure row rename, visibility, and lock.
- Per-page SEO metadata.
- Rich-text paste sanitization and regression tests.

Not included now: multi-user collaboration, comments, arbitrary free-position canvas, multi-select/marquee, z-index designer.

## Existing confirmed defects to close

- Mobile editor cannot edit section content or properties.
- Mobile publish differs from desktop persistence.
- Structure drag affordance lacks a wired reorder callback.
- Delete lacks confirmation.
- Local add paths exceed server limits before save.
- URL validation differs by block type.
- CTA/social canvas output is not interaction-accurate.
- Autosave has no conflict detection or retry queue.
- Global undo/redo steals native text undo.
- Targeted personal-site suite currently has six failures: i18n wiring, Preview label contract, landmark contract, animation select contract, and two renderer/fake-proof assertions.

## Validation matrix

Every Landing block must be checked at desktop 1440×900 and mobile 390×844:

- Add primitive block.
- Add ready-made pattern.
- Select section and nested text.
- Edit every property.
- Inline text formatting and focus retention.
- Duplicate, reorder, delete, undo, redo.
- Autosave and reload persistence.
- Preview/public parity.
- Empty and max-limit behavior.
- Keyboard navigation and accessible names.
- No horizontal overflow, clipped toolbar, console error, failed request, or stale selection.

Automated gates:

- Unit tests for all section mutation helpers and invariants.
- Component tests for properties and toolbar contracts.
- Playwright matrix for 20 block types × desktop/mobile critical flow.
- Autosave retry/conflict tests.
- Publish persistence tests.
- `npm run build`.

## Delivery order

1. Stabilize failing personal-site tests and lock current behavior.
2. Extract shared Forms-style shell primitives without behavior change.
3. Migrate Landing desktop shell.
4. Implement full mobile properties parity.
5. Unify reorder/delete/duplicate/limits.
6. Harden autosave/publish/revision behavior.
7. Validate URL/media/accessibility contracts.
8. Run full block matrix, deploy blue-green, repeat live QA.

## Acceptance

- Landing and Forms visibly share one editor system.
- All 20 Landing blocks remain available.
- Desktop and mobile expose equivalent editing capabilities.
- Per-element typography exists only inline.
- Toolbar and popovers never leave viewport.
- Save/publish status reflects server truth.
- No known personal-site test failure remains.
- Full browser matrix passes before production completion claim.
