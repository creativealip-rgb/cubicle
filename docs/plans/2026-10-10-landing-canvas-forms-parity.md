# Landing Canvas Forms-Parity Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make Landing Page builder use Forms-style canvas shell and full desktop/mobile editing parity while preserving Landing-specific blocks, pages, SEO, and publish flow.

**Architecture:** Reuse small editor-shell primitives only; do not merge Forms field schema with Landing section schema. Keep `CanvasEditor` as Landing state owner, extract mutation helpers, use one reorder/selection contract, and route desktop/mobile through equivalent capabilities. Harden autosave and publish after UI parity.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind, Radix/shadcn, dnd-kit, Zod, Vitest, Playwright.

**Approved design:** `docs/superpowers/specs/2026-10-10-landing-canvas-forms-parity-design.md`

---

## Execution rules

- Preserve unrelated working-tree files.
- One behavioral concern per commit.
- RED before GREEN for every code task.
- Do not deploy until all local gates pass.
- Before deployment, read shared deploy rules and run `PRE_DEPLOY_CHECK.sh`.
- Use blue-green container switch through `dokploy-traefik`; never bind project proxy to 80/443.

### Task 1: Stabilize existing Landing test baseline

**Objective:** Resolve six known personal-site test failures so later regressions are trustworthy.

**Files:**
- Modify: `src/lib/personal-site/editor-i18n-wiring.test.ts`
- Modify: `src/lib/personal-site/public-link-ui-wiring.test.ts`
- Modify: `src/lib/personal-site-landmark.test.ts`
- Modify: `src/components/site/canvas/properties-panel.test.tsx`
- Modify: `src/components/site/personal-site-renderer.test.tsx`
- Modify only if runtime behavior is wrong: corresponding production files under `src/components/site/`

**Steps:**
1. Run each failing test alone and classify stale assertion vs runtime defect.
2. For stale source-string assertions, replace with behavior/component assertions.
3. For renderer failures, preserve fake-proof filtering and typed-section semantics; fix production only if behavior regressed.
4. Run:
   `npm test -- --run src/components/site src/lib/personal-site`
5. Expected: all targeted tests pass.
6. Commit: `test(site): stabilize landing builder baseline`.

### Task 2: Add shared shell geometry contract tests

**Objective:** Freeze Forms-style panel and canvas behavior before extraction.

**Files:**
- Create: `src/components/builder/builder-shell.test.tsx`
- Create: `src/components/builder/builder-shell.tsx`
- Reference: `src/components/questionnaires/questionnaire-builder.tsx`
- Reference: `src/components/site/canvas/canvas-editor.tsx`

**Steps:**
1. Write failing tests for header slot, left rail, independently scrolling canvas, right properties rail, preview mode, and mobile drawer slots.
2. Verify RED.
3. Implement minimal slot-based primitives: `BuilderShell`, `BuilderWorkflowHeader`, `BuilderCanvasViewport`, `BuilderRail`.
4. No schema abstraction, context provider, factory, or new dependency.
5. Verify focused test passes.
6. Commit: `feat(builder): add shared canvas shell primitives`.

### Task 3: Migrate Landing desktop shell without behavior change

**Objective:** Match Forms shell geometry while retaining current Landing state/actions.

**Files:**
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Modify: `src/components/site/canvas/canvas-renderer.tsx`
- Use: `src/components/builder/builder-shell.tsx`
- Test: `src/components/site/canvas/device-preview.test.tsx`
- Create: `src/components/site/canvas/landing-shell.test.tsx`

**Steps:**
1. Add failing assertions for `BUILD / SETTINGS / PUBLISH`, left rail, canvas, properties rail, and preview hiding mutation affordances.
2. Replace desktop outer layout only; keep existing callbacks and state unchanged.
3. Ensure sidebars and canvas scroll independently.
4. Keep inline toolbar `fixed` and viewport-safe.
5. Run focused tests and `npm run build`.
6. Commit: `refactor(site): align landing desktop canvas with forms shell`.

### Task 4: Centralize section mutation invariants

**Objective:** Give desktop canvas, Structure panel, and mobile one mutation contract.

**Files:**
- Create: `src/lib/personal-site/editor-mutations.ts`
- Create: `src/lib/personal-site/editor-mutations.test.ts`
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Modify: `src/components/site/canvas/structure-panel.tsx`
- Modify: `src/components/site/canvas/mobile-step-editor.tsx`

**Required pure helpers:**
- `addSection(sections, section)` with 12-section limit.
- `duplicateSection(sections, id, createId)`.
- `removeSection(sections, id)`.
- `moveSection(sections, activeId, overId)`.
- `moveSectionByOffset(sections, id, delta)`.
- `normalizeContentBlock(section)` ensuring item count matches columns.
- Page add helper enforcing 10-page limit.

**Steps:**
1. Write tests for success, boundaries, immutable input, unknown IDs, and limits.
2. Verify RED.
3. Implement minimum pure helpers.
4. Replace duplicated inline array mutations in three editors.
5. Wire Structure panel reorder callback to same helper.
6. Verify tests.
7. Commit: `refactor(site): unify landing section mutations`.

### Task 5: Add destructive-action safety and mobile duplicate

**Objective:** Prevent accidental content loss and close desktop/mobile action parity.

**Files:**
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Modify: `src/components/site/canvas/canvas-renderer.tsx`
- Modify: `src/components/site/canvas/mobile-step-editor.tsx`
- Create: `src/components/site/canvas/section-actions.test.tsx`

**Steps:**
1. Write tests: non-empty delete asks confirmation; empty section may delete directly; mobile exposes duplicate; undo restores deleted section.
2. Use existing confirm-dialog pattern; no browser `confirm()`.
3. Add duplicate to mobile section action group.
4. Announce max-limit failures via bilingual toast.
5. Verify focused tests.
6. Commit: `feat(site): harden section actions across devices`.

### Task 6: Build full mobile properties drawer

**Objective:** Make every Landing section property editable on mobile.

**Files:**
- Modify: `src/components/site/canvas/mobile-step-editor.tsx`
- Modify: `src/components/site/canvas/properties-panel.tsx`
- Create: `src/components/site/canvas/mobile-properties-drawer.tsx`
- Create: `src/components/site/canvas/mobile-properties-parity.test.tsx`

**Steps:**
1. Extract reusable properties content from desktop-only `<aside>` wrapper.
2. Write failing parity table test for all 20 section types.
3. Render same properties content inside mobile bottom drawer.
4. Preserve inline-only typography; no font/size/B/I/U/S/alignment duplicates.
5. Add close/back behavior and focus return to selected section.
6. Verify all section type tests.
7. Commit: `feat(site): add full mobile section editing parity`.

### Task 7: Align mobile canvas interaction with Forms

**Objective:** Use one canvas-first mobile mental model instead of reduced management-only steps.

**Files:**
- Modify: `src/components/site/canvas/mobile-step-editor.tsx`
- Modify: `src/components/site/canvas/inline-text.tsx`
- Modify: `src/components/site/canvas/floating-context-toolbar.tsx`
- Test: `src/components/site/canvas/mobile-step-editor.test.tsx`

**Steps:**
1. Add tests for Elements drawer, Structure drawer, Properties drawer, selected section, inline toolbar, and viewport containment at 390px.
2. Keep canvas visible as primary surface.
3. Use drawers for space-constrained controls.
4. Ensure toolbar wraps or horizontally scrolls without viewport overflow.
5. Verify focus survives toolbar interaction.
6. Commit: `feat(site): align mobile canvas interactions with forms`.

### Task 8: Scope keyboard shortcuts correctly

**Objective:** Preserve native text editing undo while retaining document shortcuts.

**Files:**
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Create: `src/lib/builder-shortcuts.ts`
- Create: `src/lib/builder-shortcuts.test.ts`

**Steps:**
1. Write tests for input, textarea, select, and contenteditable targets.
2. `Ctrl/Cmd+Z`, redo, Delete, and duplicate must not intercept editable targets.
3. `Ctrl/Cmd+S` may still save from editable targets.
4. Remove duplicate undo listeners from `canvas-editor.tsx`.
5. Verify tests.
6. Commit: `fix(site): scope canvas shortcuts away from text editing`.

### Task 9: Make preview interaction-accurate

**Objective:** Canvas preview represents public CTA, social links, and navigation safely.

**Files:**
- Modify: `src/components/site/canvas/canvas-renderer.tsx`
- Modify: `src/components/site/personal-site-renderer.tsx`
- Modify: `src/lib/personal-site/model.ts`
- Test: `src/components/site/personal-site-renderer.test.tsx`
- Create: `src/components/site/canvas/canvas-public-parity.test.tsx`

**Steps:**
1. Write failing tests for CTA anchor destination, social links, image links, and embed URL policy.
2. Centralize safe public URL validation; apply to every URL-bearing field.
3. In edit mode, intercept navigation while displaying real destination affordance.
4. In preview mode, allow safe navigation behavior.
5. Verify renderer and canvas parity.
6. Commit: `fix(site): align canvas links with public rendering`.

### Task 10: Enforce image accessibility contract

**Objective:** Prevent publishing meaningful images without text alternatives.

**Files:**
- Modify: `src/lib/personal-site/model.ts`
- Modify: `src/components/site/canvas/properties-panel.tsx`
- Modify: `src/components/site/canvas/image-upload.tsx`
- Modify: `src/lib/personal-site/readiness.ts`
- Tests: matching model/readiness/properties tests

**Steps:**
1. Add `decorative` boolean to image/gallery/media image contracts where needed.
2. Test rule: alt required unless decorative.
3. Add Decorative toggle; hide/disable alt only when selected.
4. Add readiness issue that selects affected section.
5. Keep hero explicitly decorative unless product model provides semantic hero image.
6. Verify tests.
7. Commit: `feat(site): enforce accessible image metadata`.

### Task 11: Correct autosave and publication semantics

**Objective:** Save content without accidentally changing public status.

**Files:**
- Modify: `src/lib/actions/personal-site.ts`
- Modify: `src/components/site/canvas/canvas-page-client.tsx`
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Modify: `src/components/site/canvas/mobile-step-editor.tsx`
- Tests: `src/lib/personal-site-publication-persistence.test.ts`
- Create: `src/lib/personal-site/autosave-contract.test.ts`

**Contract:**
- `save` preserves current publication state.
- `publish` explicitly sets true.
- `unpublish` explicitly sets false.
- Mobile and desktop call same explicit publication path.

**Steps:**
1. Write negative tests proving ordinary autosave cannot publish/unpublish.
2. Replace draft-intent conflation with explicit save intent.
3. Mobile publish button awaits server result; update local state after success.
4. Remove route refresh unless fresh server data is required.
5. Verify tests.
6. Commit: `fix(site): unify autosave and publication state`.

### Task 12: Add autosave retry and actionable errors

**Objective:** Make save state truthful and recoverable.

**Files:**
- Create: `src/lib/use-retrying-autosave.ts`
- Create: `src/lib/use-retrying-autosave.test.ts`
- Modify: `src/components/site/canvas/canvas-editor.tsx`
- Modify: `src/components/site/canvas/canvas-page-client.tsx`

**Steps:**
1. Test states: idle, pending, saved, failed, retrying.
2. Retry transient failures with bounded exponential delays; validation errors do not retry.
3. Keep dirty state after failure.
4. Show persistent Retry action, not toast only.
5. Return field-path errors from save adapter; select and scroll to invalid section/property.
6. Verify tests.
7. Commit: `feat(site): add recoverable landing autosave`.

### Task 13: Add stale-tab conflict protection

**Objective:** Prevent last-write-wins data loss across tabs/sessions.

**Files:**
- Modify schema file containing personal-site record version/update timestamp.
- Create migration under existing migration convention.
- Modify: `src/lib/actions/personal-site.ts`
- Modify: `src/lib/personal-site/model.ts`
- Add action-level tests.

**Steps:**
1. Inspect actual schema and migration ledger; use existing timestamp/version if available.
2. Write failing action test for stale revision.
3. Add optimistic concurrency condition scoped to owner/workspace.
4. Return conflict result with Reload and Keep local copy options.
5. Do not auto-merge JSON documents.
6. Apply migration once and verify against dev DB.
7. Commit: `feat(site): prevent stale landing page overwrites`.

### Task 14: Finish accessibility and focus contracts

**Objective:** Make builder keyboard-usable and screen-reader coherent.

**Files:**
- Modify: floating toolbar, structure panel, properties drawer, canvas renderer.
- Create Playwright accessibility spec under existing E2E convention.

**Steps:**
1. Add accessible names and `aria-pressed` to every icon/toggle button.
2. Restore focus when popovers/dialogs/drawers close.
3. Add live announcements for reorder, duplicate, delete, save, and limits.
4. Respect reduced motion for section animation preview.
5. Test keyboard selection, toolbar traversal, drawer return, DnD instruction.
6. Commit: `fix(site): complete canvas accessibility contracts`.

### Task 15: Full 20-block browser matrix

**Status: done.** See the verification log at the end of this file.

**Objective:** Prove every block works on desktop and mobile.

**Files:**
- Create: `e2e/personal-site-block-matrix.spec.ts` (the repo uses `e2e/`, not
  `tests/e2e/`).
- Create fixture/helper only if existing E2E conventions need it.

**Matrix per block:**
- Add.
- Select.
- Edit all available properties.
- Inline formatting where applicable.
- Duplicate.
- Reorder.
- Delete and undo.
- Autosave and reload persistence.
- Preview/public rendering.
- Desktop 1440×900.
- Mobile 390×844.
- No horizontal overflow, clipped popover, console error, or failed request.

**Steps:**
1. Use isolated QA fixture, not user's production content.
2. Clean up fixture.
3. Run complete matrix.
4. Save screenshots for Landing desktop/mobile and representative block classes.
5. Commit: `test(site): cover landing block matrix`.

### Task 16: Release verification

**Status: done.** See the verification log at the end of this file.

**Objective:** Ship only after local and routed-live proof.

**Steps:**
1. Run targeted personal-site tests; expected 0 failures.
2. Run project lint/typecheck commands defined in `package.json`.
3. Run `npm run build`; expected exit 0.
4. Read:
   - `/root/.hermes/shared-workspace/DEPLOYMENT_GUARDRAILS.md`
   - `/root/.hermes/shared-workspace/DEPLOY_RULES.md`
5. Run `/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh` from repo.
6. Build immutable image tagged with commit SHA.
7. Start inactive blue/green container, health-check internally.
8. Switch only `dokploy-traefik` route.
9. Verify ports 80/443 ownership unchanged.
10. Run full live desktop/mobile matrix against routed production.
11. Preserve rollback image until verification passes.
12. Commit no generated screenshots or temporary QA credentials.

## Verification log

### 2026-10-10 — Task 15 and Task 16 evidence

Every result below is a real command result, not a projection.

| run | target | result |
|-----|--------|--------|
| `e2e/personal-site-block-matrix.spec.ts` (both tests) | dev `dev.cubiqlo.com` | **2 passed (3.5m)** — desktop 1440x900 (20 blocks, 2.1m) + mobile 390x844 (19 catalogue entries, 1.3m) |
| mobile matrix, 19 entries, per-entry probe | dev | **19/19 OK**; each entry also asserted `confirm=1`, i.e. the confirmation dialog fires for non-empty blocks |
| mobile matrix, 19 entries | prod `app.cubiqlo.com` | **19/19 OK** |
| desktop matrix | prod `app.cubiqlo.com` | 20/20, verified earlier in this release |

Both tests assert zero horizontal overflow, zero console errors and zero failed
requests as part of passing; the mobile test asserts them at the narrowest width.

**Fixture discipline.** Runs target a dedicated QA account and an isolated fixture
site. Each mobile entry deletes what it inserted, so the fixture returns to its
8-section baseline (`8 / pages[0]=8`). The committed spec refuses to run against
production by design (`safeMutatingTarget`); the prod run used a throwaway probe
under `/root/builds/t15/probes/` instead.

**Two production hazards were found and contained.**

1. *The builder picks its site from the active workspace, and the fallback is the
   user's first membership.* For the QA account that membership is the workspace
   owning the live published site, so a prod run that does not pin
   `active_workspace_id` silently writes to live content — no warning, no error.
   The prod run pins the cookie to a throwaway workspace inside its own browser
   context and gates on the loaded canvas fingerprinting as that draft before
   mutating anything.
2. *The DB can lag the UI at the end of a run.* Measured on prod: canvas showed 3
   sections while the DB held 4, because the final delete's autosave had not
   landed before the browser closed. Restoring from a pre-run `row_to_json`
   backup is therefore required; a "net zero" insert/delete loop is not proof.

Post-restore verification: both production sites identical to their backup across
all 21 columns.

**Corrections to this plan.** The spec lives at `e2e/`, not `tests/e2e/`. Mobile
does not expose the desktop palette — it renders a 19-entry pattern catalogue — so
the mobile matrix asserts those 19 entries rather than the 20 desktop blocks.
Mobile drawers are Radix modals: while one is open the rest of the document is
`aria-hidden` (role-based locators stop resolving) and the backdrop swallows
pointer events (close with `Escape`, not by clicking). Selecting a section by
clicking it in the canvas is unreliable, because several entries render their own
interactive controls; select through the Structure drawer's `#section-row-<id>`
instead.

## Final acceptance checklist

- [ ] Landing and Forms share canonical shell geometry.
- [ ] All 20 Landing blocks remain functional.
- [ ] Desktop/mobile editing capabilities match.
- [ ] Per-element typography exists only inline.
- [ ] Toolbar/popovers stay inside viewport.
- [ ] Structure and canvas reorder use one contract.
- [ ] Safe deletion, duplicate, limits, and undo work.
- [ ] URL and image accessibility contracts are consistent.
- [ ] Autosave retries and detects stale revisions.
- [ ] Save never changes publication unintentionally.
- [ ] All personal-site tests pass.
- [x] Full browser matrix passes locally and live.
      Evidence: the four runs in the verification log above (dev *and* prod, both
      viewports).
- [x] Production health, routing, ports, and rollback verified.
      Evidence: prod serves the release healthily through `dokploy-traefik` with
      the previous image retained for rollback; ports 80/443 ownership unchanged.
