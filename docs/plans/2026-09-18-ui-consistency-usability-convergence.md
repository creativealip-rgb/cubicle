# Cubiqlo UI Consistency & Usability Convergence Plan

**Baseline:** `739572cdc18825474a9ee73e950020ec3b309063`  
**Scope:** app + admin consistency, mobile efficiency, picker focus, semantic correctness, i18n, loading, accessibility.  
**Non-goals:** schema/data mutation, billing logic changes, redesign, new dependencies.

## Acceptance ledger

### Phase 1 — Semantic correctness
- [x] Time KPI renders `—` instead of `100%` when total tracked time is zero.
- [x] Dashboard Recent Activity links to `/app/activities` with `View All Activity` copy.
- [x] Activity entity types are humanized/localized; no raw underscore values.
- [x] Dashboard account/workspace controls have explicit accessible identity labels.

### Phase 2 — Searchable picker consistency
- [x] Weekly project and task popovers preserve input focus on open.
- [x] Add Time Log, Task Import, Project Form, Recurring Invoice remain focus-safe.
- [x] Project/client/task icon triggers expose combobox/menu state where applicable.

### Phase 3 — Mobile efficiency
- [x] Shared PageHeader descriptions wrap up to two lines on mobile; desktop stays compact.
- [x] Dashboard KPI cards use compact two-column mobile layout.
- [x] Time KPI cards use compact mobile grid.
- [x] Time primary action hierarchy favors Start Timer; export remains secondary.
- [x] Settings mobile navigation exposes sections without hidden-only dropdown UX.
- [x] Settings save scopes use explicit labels.
- [x] Recurring invoice line items stack safely on narrow screens.

### Phase 4 — i18n, loading, accessibility
- [x] Billing checkout uses app language for period, prices, active/loading/error copy.
- [x] Recurring invoice frequency and controls localized.
- [x] Weekly dates use app-selected locale.
- [x] Recurring invoice action menu has accessible name/state.
- [x] Recurring invoice pending state disables menu controls.
- [x] Questionnaire destructive mutation uses LoadingButton in app dialog.
- [x] Destructive marketing-spend and questionnaire delete actions use app dialog, not native confirm.
- [x] AI upgrade CTA uses localized label; message parsing remains backward compatible.

### Phase 5 — Verification and release
- [x] Focused regression test RED then GREEN.
- [x] Focused ESLint clean.
- [x] TypeScript clean.
- [x] Full production build passes.
- [ ] Desktop + 390px route smoke: no console/page errors, no horizontal overflow.
- [ ] Weekly picker accepts multi-character input without losing focus.
- [ ] Production deploy uses exact SHA; health and proxy ownership pass.

## Evidence levels

Each row needs source/test evidence. Visual/layout rows additionally need fresh browser evidence. Deployment is a separate final gate; build success alone does not mark production PASS.

## Current next action

Commit implementation, then run fresh authenticated desktop/mobile browser QA against release candidate. Production deployment remains approval-gated.
