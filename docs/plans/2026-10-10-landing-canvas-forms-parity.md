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

**Objective:** Prove every block works on desktop and mobile.

**Files:**
- Create: `tests/e2e/personal-site-block-matrix.spec.ts` or repo-equivalent location.
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
- [ ] Full browser matrix passes locally and live.
- [ ] Production health, routing, ports, and rollback verified.
