# Client, Project, Invoice, Portal, and Task Workspace Revision Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Deliver scoped Client→Project and Project→Invoice workflows, truthful/revealable Portal password state, unified editable Project Tasks, complete Task Template management, and working 10-row global Task pagination.

**Architecture:** Extend existing shared forms/actions rather than adding duplicate Client- or Project-specific implementations. Context is passed as immutable scope (`clientId`, `projectId`) and revalidated server-side; navigation origin is explicit and tenant-validated. Historical Task mode remains canonical per row. Portal authentication keeps hash verification and adds nullable authenticated ciphertext for owner/admin reveal.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL 16, Drizzle ORM, Better Auth crypto, Zod, Vitest, Playwright, Tailwind/shadcn/Radix.

**Canonical design:** `docs/superpowers/specs/2026-08-01-client-project-invoice-task-workspace-revision-design.md`

**Baseline:** `main` at `e669fcd` or a newer fast-forward descendant.

---

## Safety boundaries

1. TDD for every behavior change: RED, minimal GREEN, targeted verification, then commit.
2. Never reset or mutate a real account password during QA.
3. Portal plaintext must never be stored, logged, committed, or written into evidence.
4. Existing hash-only Portal passwords remain valid and unrecoverable until explicitly changed.
5. Existing Task modes are not converted; Project policy only controls new-task default.
6. Project-scoped Invoice may reference only its locked Project.
7. Migration is additive. `0062` remains retired and must not run.
8. Production deploy requires explicit approval, verified backup/restore, migration rehearsal, immutable image, and live QA.
9. Before VPS deploy, read shared guardrails and run `PRE_DEPLOY_CHECK.sh`; `dokploy-traefik` remains sole public owner of 80/443.

## Execution checkpoint

- Plan authored from `main` at `e669fcd`; historical authoring state retained below.
- Active implementation branch: `feat/client-project-invoice-task-revision`.
- Latest pushed checkpoint before final Task 19 changes: `3af949d`.
- Migration `0065` reserved and implemented additively; `0062` remains retired.
- Feature branch is not integrated to `dev/integration`; shared dev and production remain untouched.

## Implementation status — updated 2026-08-01

- Tasks 0–17: **complete, committed, and pushed**.
- Task 18: **complete** — ESLint, TypeScript, production-shape build, 181 test files / 758 tests, targeted PostgreSQL/Portal verification, and migration rehearsal passed.
- Task 19: **complete locally; final commit/push pending** — 8/8 Playwright cases pass across desktop/mobile and isolated QA data. Verified: pagination 10/2, mixed-mode visibility/edit persistence, List/Board mutation persistence, scoped Project/Invoice persistence, Invoice Back origins, localized Invoice status/currency, Portal owner/legacy/unauthorized lifecycle, Template/item CRUD/reorder/archive/restore/duplicate, zero-selection guard, and stale-preview invalidation.
- Task 19 cleanup passed: isolated QA workspaces/clients returned to zero and QA user plan restored to Free.
- Task 20: **not started**; production approval and full release gates still required.
- Progress ledger: `docs/operations/client-project-invoice-task-revision-progress.md`.
- QA evidence: `docs/operations/evidence/2026-08-01-client-task-revision-final-qa.md`.

---

### Task 0: Push approved design and reserve migration safely

**Objective:** Synchronize the approved design and reserve the next free additive migration number without collision.

**Files:**
- Modify: `docs/migration-registry.md`
- Modify: `ACTIVE_BOARD.md`

**Steps:**

1. Run `git fetch --all --prune`, inspect `git status`, every worktree, every ref, and untracked `drizzle/*.sql`.
2. Push `e669fcd` only after confirming `origin/main` has no remote-only commits.
3. Confirm no `0065` allocation exists. If it exists anywhere, choose the next free number and use it consistently below.
4. Reserve `0065` for encrypted Portal password display, with owner/branch/status in registry and active board.
5. Run `git diff --check`; commit only reservation files as `docs: reserve portal password encryption migration`.

**Gate:** one canonical reservation, no SQL yet, local/remote synchronized.

---

### Task 1: Add Client-scoped Project creation contract

**Objective:** Reuse the Project dialog in Client detail while locking Client context and preserving plan limits.

**Files:**
- Modify: `src/components/projects/project-create-dialog.tsx`
- Modify: `src/components/forms/project-form.tsx`
- Modify: `src/app/(app)/app/clients/[clientId]/page.tsx`
- Modify: `src/lib/actions/projects.ts` only if result data is needed for refresh behavior
- Create: `src/lib/client-detail-project-create-wiring.test.ts`

**RED assertions:**

- `ProjectCreateDialog` accepts optional `clientId`.
- Scoped `ProjectForm` receives `clientId` and does not render Client selector.
- Client detail Project tab renders `Tambah Proyek`.
- Success closes Dialog, retains `?tab=projects`, and refreshes.
- Plan-limit disabled state/explanation remains.
- Server action scopes Client to active workspace.

**Run RED:**

```bash
npm run test -- src/lib/client-detail-project-create-wiring.test.ts
```

**Implementation:** Add optional scope props to shared dialog/form; query or derive plan-limit state in Client detail; use controlled Dialog and `router.refresh()` after confirmed success. Do not create a duplicate form.

**Verify:** targeted test, relevant Project/client tests, `npx tsc --noEmit`, ESLint on touched files.

**Commit:** `feat(clients): create scoped projects from client detail`

---

### Task 2: Define explicit Invoice origin policy

**Objective:** Make Invoice Back destinations deterministic and tenant-safe.

**Files:**
- Create: `src/lib/invoice-origin.ts`
- Create: `src/lib/invoice-origin.test.ts`
- Modify: `src/app/(app)/app/invoices/[invoiceId]/page.tsx`
- Modify: Client Invoice links in `src/app/(app)/app/clients/[clientId]/page.tsx`
- Modify: Project Invoice links in `src/components/projects/project-billing-tab.tsx` (renamed later)
- Modify: global Invoice links where needed
- Create: `src/lib/invoice-origin-wiring.test.ts`

**RED behavior:** parse only `project|client|global`; require matching resource ID; reject malformed IDs; build stable Back URLs; missing/invalid origin falls back `/app/invoices`; origin does not grant resource access.

**Implementation:** pure parser/builder plus server-side workspace validation before showing contextual Back link. Add explicit origin query to Project/Client/global links.

**Verify:** pure tests, wiring tests, Invoice access tests, TypeScript.

**Commit:** `fix(invoices): preserve validated navigation origin`

---

### Task 3: Build Project-scoped Invoice dialog

**Objective:** Create an Invoice from Project detail without Client/Project selectors or page navigation.

**Files:**
- Create: `src/components/invoices/project-invoice-create-dialog.tsx`
- Modify: `src/components/forms/invoice-form.tsx`
- Modify: `src/lib/actions/invoices.ts`
- Modify: `src/app/(app)/app/projects/[projectId]/page.tsx`
- Modify/rename content component: `src/components/projects/project-billing-tab.tsx`
- Create: `src/lib/project-invoice-dialog-wiring.test.ts`
- Extend behavior tests: `src/lib/invoice-create-form.test.ts`, `src/lib/invoice-project-items.test.ts`

**RED behavior:**

- Tab label is `Invoice`, not `Billing`.
- Duplicate commercial summary is absent from tab content.
- `Buat Invoice` opens Dialog.
- Locked `clientId`/`projectId` are provided by server context and selectors are hidden.
- Server rejects Project/Client mismatch and other-Project items.
- Success closes Dialog, refreshes current Project Invoice tab, and does not navigate.
- Global Invoice form behavior remains unchanged.

**Implementation:** add explicit scoped-mode props/callback to shared Invoice form; avoid hard-coded `router.push` in scoped mode; server repeats Project/Client/workspace checks and item-source checks.

**Verify:** targeted tests, Invoice finance/integrity suites, TypeScript, lint, build.

**Commit:** `feat(projects): create scoped invoices in project dialog`

---

### Task 4: Localize Client Invoice list and harden Portal control accessibility

**Objective:** Fix visible formatting/accessibility defects in touched Client detail tabs.

**Files:**
- Modify: `src/app/(app)/app/clients/[clientId]/page.tsx`
- Modify: `src/app/(app)/app/clients/[clientId]/portal-section.tsx`
- Reuse: currency/status helpers
- Create: `src/lib/client-detail-invoice-portal-polish.test.ts`

**RED behavior:** status labels localized; amounts use existing currency formatter; Portal link/copy/reveal controls have accessible names; no raw `draft/viewed/paid` or unformatted decimal display.

**Verify:** targeted test, accessibility wiring tests, TypeScript.

**Commit:** `fix(clients): polish invoice and portal detail tabs`

---

### Task 5: Add pure Portal password encryption module

**Objective:** Provide versioned authenticated encryption without weakening hash authentication.

**Files:**
- Create: `src/lib/portal-password-encryption.ts`
- Create: `src/lib/portal-password-encryption.test.ts`
- Modify: env validation module if one exists

**API:**

```ts
export type EncryptedPortalPassword = { ciphertext: string; nonce: string; version: number };
export function encryptPortalPassword(plaintext: string, key: string): EncryptedPortalPassword;
export function decryptPortalPassword(value: EncryptedPortalPassword, key: string): string;
```

**RED matrix:** round trip; random nonce produces different ciphertext; wrong key/tamper fails; missing/invalid key fails closed; plaintext absent from ciphertext; version validation; no logging.

**Implementation:** authenticated encryption from Node crypto with a strict key format sourced from `PORTAL_PASSWORD_ENCRYPTION_KEY`.

**Verify:** targeted tests and TypeScript.

**Commit:** `feat(portal): add password encryption primitive`

---

### Task 6: Add additive Portal password ciphertext schema

**Objective:** Store nullable reversible password material for new/changed passwords while preserving legacy hashes.

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0065_portal_password_ciphertext.sql` (or reserved number)
- Modify: `docs/migration-registry.md`
- Create: `src/lib/portal-password-schema-wiring.test.ts`
- Create/update: PostgreSQL integration test for migration

**Columns:** nullable ciphertext, nonce, version, and encrypted-at timestamp on the canonical Client Portal record/table; add only fields proven necessary by current schema. Do not add plaintext columns/defaults.

**RED assertions:** additive-only SQL; existing hash unchanged; hash-only rows valid; ciphertext fields all-null or complete; schema exports align; no `DROP`; migration replay safe according to project conventions.

**Real DB gate:** restore disposable PostgreSQL 16 clone, apply only reserved migration, verify old hashes and null ciphertext, insert encrypted fixture, replay/no-op expectations, drop clone.

**Commit:** `feat(portal): add encrypted password storage`

---

### Task 7: Make Portal password mutation atomic and reveal owner/admin-only

**Objective:** Write hash+ciphertext atomically and expose a guarded reveal action.

**Files:**
- Modify: `src/lib/actions/clients.ts`
- Modify/create access helper as needed
- Modify audit action/entity constants if needed
- Create: `src/lib/portal-password-actions.test.ts`
- Create: `src/lib/integration/portal-password.postgres.test.ts`

**RED matrix:**

- create/change writes hash and ciphertext atomically;
- encryption failure leaves old hash/ciphertext unchanged;
- owner/admin reveal succeeds;
- member/viewer/outsider reveal fails;
- hash-only legacy returns unrecoverable state, never fake plaintext;
- reveal creates audit event without password data;
- tenant mismatch fails;
- login still verifies hash.

**Implementation:** transaction around mutation; reveal server action decrypts only after role/tenant checks; return plaintext only to current authorized request; no cache.

**Verify:** targeted, auth/Portal suites, real PostgreSQL integration.

**Commit:** `feat(portal): secure password reveal and rotation`

---

### Task 8: Redesign Client Portal password states

**Objective:** Render truthful no-password, legacy hash-only, and revealable-password UX.

**Files:**
- Modify: `src/app/(app)/app/clients/[clientId]/portal-section.tsx`
- Create: `src/lib/client-portal-status.ts`
- Create: `src/lib/client-portal-status.test.ts`
- Modify: Client detail summary to use shared helper
- Create: `src/lib/client-portal-password-state-wiring.test.ts`

**RED behavior:** explicit three states; masked default; reveal/hide/copy/change; owner/admin gating; legacy explanation; shared active-status helper; responsive Dialog; accessible labels; plaintext never server-rendered into initial HTML.

**Verify:** targeted tests, Portal auth tests, TypeScript, lint.

**Commit:** `feat(clients): show truthful portal password states`

---

### Task 9: Define combined Project Task presentation model

**Objective:** Combine workflow/reusable rows without mutating stored mode.

**Files:**
- Create: `src/lib/project-task-presentation.ts`
- Create: `src/lib/project-task-presentation.test.ts`
- Modify Task row types as needed

**RED behavior:** preserve input order/position; include every Task; mode badge derives from stored mode; edit fields derive from stored mode, not Project default; Project policy only supplies create mode; lifecycle/status remain mode-specific.

**Commit:** `feat(tasks): add combined project task presentation`

---

### Task 10: Build editable reusable Task surface

**Objective:** Allow title/description/default assignee/lifecycle edits for reusable Tasks.

**Files:**
- Modify: `src/components/tasks/reusable-task-workspace.tsx`
- Modify: `src/components/forms/task-form.tsx`
- Modify: `src/components/tasks/task-detail-sheet.tsx` or create a shared edit Dialog
- Modify: `src/lib/actions/tasks.ts` only for missing lifecycle/description invariants
- Create: `src/lib/reusable-task-edit-wiring.test.ts`
- Extend: `src/lib/billing-aware-task-actions.test.ts`

**RED behavior:** edit action exists; mode locked; no workflow fields for reusable; archive/restore explicit; assignee optional and workspace-valid; no no-op movement controls.

**Verify:** targeted tests, Task action suites, TypeScript.

**Commit:** `feat(tasks): edit reusable project tasks`

---

### Task 11: Render all historical Project Tasks in one workspace

**Objective:** Show mixed stored modes in one list and align controls.

**Files:**
- Modify: `src/app/(app)/app/projects/[projectId]/page.tsx`
- Modify: `src/components/tasks/project-task-workspace.tsx`
- Modify workflow/reusable list components
- Modify: `src/lib/project-task-workspace-wiring.test.ts`
- Create: `src/lib/project-task-historical-visibility.test.ts`

**RED behavior:** Hourly/Retainer shows workflow+reusable historical rows; Fixed Price shows both; badges visible; edit dispatches by stored mode; create uses current default; fixed workflow toolbar aligns `Tambah Tugas | List | Board`; reusable has no Board; mobile wraps; legacy package remains safe/readable.

**Verify:** targeted tests and a DB-backed fixture with mixed modes.

**Commit:** `fix(tasks): show all historical project tasks`

---

### Task 12: Implement real Task reorder controls

**Objective:** Remove no-op controls and support collision-safe reorder.

**Files:**
- Modify: `src/components/tasks/reusable-task-workspace.tsx`
- Modify: `src/components/tasks/project-task-workspace.tsx`
- Modify: `src/lib/actions/tasks.ts`
- Extend PostgreSQL integration matrix
- Create: `src/lib/project-task-reorder-wiring.test.ts`

**RED behavior:** complete ordered IDs required per Project/mode; transaction avoids unique-position collisions; up/down moves exactly one position; boundary controls disabled; controls absent without handler; cross-workspace/mode IDs rejected.

**Commit:** `fix(tasks): wire accessible project task reorder`

---

### Task 13: Add complete global Task pagination

**Objective:** Display 10 Tasks per page with count and preserved filters.

**Files:**
- Modify: `src/app/(app)/app/tasks/page.tsx`
- Modify/create pagination component
- Modify: `src/components/tasks/project-task-workspace.tsx` to remove dead global pagination assumptions
- Create: `src/lib/global-task-pagination.test.ts`

**RED behavior:** filtered count; `.limit(10)` + valid offset; `page=N`; previous/next/page indicator; preserve tab/search/status/priority/Project/Client/mode; filter change resets page; invalid page clamps; List/Board share page batch.

**Verify:** targeted test, global Task tests, browser fixture with >10 Tasks.

**Commit:** `feat(tasks): paginate global tasks by ten`

---

### Task 14: Align global Task tabs with Invoice page style

**Objective:** Use established compact query-backed tab styling.

**Files:**
- Modify: `src/components/tasks/task-page-tabs.tsx`
- Reference: Invoice tabs component/style
- Modify: `src/lib/global-task-page-wiring.test.ts`

**RED behavior:** same active/spacing/overflow classes as canonical Invoice tabs; labels `Tugas Proyek | Template Tugas`; search params preserved.

**Commit:** `style(tasks): align task tabs with invoice navigation`

---

### Task 15: Replace Task Template scaffolding with full template dialogs

**Objective:** Implement create/edit/archive/restore/duplicate with human labels.

**Files:**
- Modify: `src/components/tasks/task-template-workspace.tsx`
- Create shared template form Dialog if useful
- Modify actions only for proven missing restore/update fields
- Create: `src/lib/task-template-workspace-ui.test.ts`

**RED behavior:** explicit create/edit Dialog; no double-click `" edit"`; name/description/target editable; archive/restore; duplicate; archived read-only; human labels; styled controls; empty state.

**Verify:** targeted action/UI tests, TypeScript.

**Commit:** `feat(tasks): complete task template management`

---

### Task 16: Implement full Task Template item editing and reorder

**Objective:** Make every template item editable and reorder one step safely.

**Files:**
- Modify: `src/components/tasks/task-template-workspace.tsx`
- Modify: `src/lib/actions/task-templates.ts` only if needed
- Create: `src/lib/task-template-item-ui.test.ts`
- Extend real PostgreSQL template integration

**RED behavior:** create/edit title/description/default assignee/remove; up/down exactly one position; boundaries disabled; archived writes unavailable and server-rejected; transaction and complete-ID validation preserved.

**Commit:** `feat(tasks): edit and reorder template items`

---

### Task 17: Harden Task Template import preview state

**Objective:** Prevent stale preview, accidental all-item import, and misleading compatibility override.

**Files:**
- Modify: `src/components/tasks/task-template-import-dialog.tsx`
- Modify: `src/lib/actions/task-templates.ts`
- Modify: `src/lib/task-template-import.ts`
- Extend: import pure/action/wiring tests

**RED matrix:** zero selected means zero; template/toggle change clears preview and old selection; preview fingerprint covers all choices/decisions; submit rejects stale fingerprint; empty template state; copy says `Izinkan template tidak cocok`; duplicate decisions preserved; existing idempotency remains.

**Verify:** pure tests, action tests, real PostgreSQL atomicity/idempotency tests.

**Commit:** `fix(tasks): harden template import preview state`

---

### Task 18: Full automated and PostgreSQL verification

**Objective:** Prove all slices integrate without regression.

**Run:**

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
scripts/test-postgres-integration.sh src/lib/integration/billing-aware-tasks.postgres.test.ts
# plus Portal password integration wrapper/test
```

Expected: zero failures/skips introduced; build exit 0; disposable databases cleaned. Save bounded logs under `/tmp/cubiqlo-client-task-revision-final/`.

If legacy wiring tests fail, classify obsolete UI contract versus durable invariant; update only superseded UI assertions.

---

### Task 19: Authenticated browser QA desktop and mobile

**Objective:** Exercise real workflows against isolated QA records.

**Viewports:** 1440×1000 and 390×844.

**Required flows:**

1. Client creates Project without Client selector; remains Projects tab.
2. Project Invoice tab has no duplicate billing summary; creates locked Invoice in Dialog and stays tab.
3. Invoice Back works from Project, Client, and global origin.
4. Portal no-password, legacy hash-only, revealable encrypted password, hide/copy/change, unauthorized denial.
5. Mixed-mode Project shows all historical Tasks; workflow/reusable edits persist.
6. Fixed Price Task toolbar aligns; List/Board switch works.
7. Global Tasks page 1/2 with 10 rows and preserved filters.
8. Template create/edit/archive/restore/duplicate; item CRUD/reorder; import zero-selection and stale-preview negative cases.
9. Client Invoice status/currency formatting and accessible controls.
10. Zero horizontal overflow, error cards, app-origin console/page errors, and fresh server errors.

Create reusable Playwright coverage where stable. Clean QA records and ciphertext fixtures afterward. Write evidence under `docs/operations/evidence/`.

**Commit:** `test: verify client invoice portal task revisions`

---

### Task 20: Production release gate

**Objective:** Deploy only after explicit approval and all evidence is green.

**Prerequisites:** clean pushed Git SHA; full automated/DB/browser gates; read guardrails; proxy collision check; production DB custom-format backup + SHA-256 + disposable restore proof; exact additive migration rehearsal; current env captured mode 600; old image rollback tag.

**Deploy:**

1. Build immutable image tagged with pushed SHA.
2. Apply only reviewed Portal ciphertext migration to canonical `cubicle`; never run `0062`.
3. Recreate only `cubiqlo-new-app`, preserving env/restart/network and no host port binding.
4. Verify internal/public health, exact image ID, DB schema, app logs, `cubiqlo.com`, `app.cubiqlo.com`, and unrelated 9Router route.
5. Repeat authenticated desktop/mobile live QA for critical flows.
6. Record backup, checksum, migration, image, rollback, health, proxy, QA, cleanup, and final Git equality.
7. Update canonical design/plan status and commit/push deployment evidence.

---

## Final acceptance checklist

- [x] Client-scoped Project Dialog works and stays in Client Projects tab.
- [x] Project detail uses Invoice tab and scoped Invoice Dialog.
- [x] Project-scoped Invoice cannot switch Client/Project or include another Project.
- [x] Invoice Back respects validated Project/Client/global origin.
- [x] Portal states are truthful; owner reveal, legacy hash-only, and unauthorized denial browser cases passed.
- [x] Existing hash-only Portal passwords remain valid and unrecoverable until changed.
- [x] All stored Project Tasks display in one list with mode badges.
- [x] Workflow and reusable Tasks edit according to stored mode; browser and DB persistence passed.
- [x] Reorder controls work or are absent; no no-op controls.
- [x] Global Tasks paginate 10 per page with preserved filters.
- [x] Task tabs match canonical Invoice-style navigation.
- [x] Template and item CRUD/reorder/archive/restore are complete.
- [x] Import zero-selection guard and stale-preview invalidation passed.
- [x] Client Invoice formatting and Portal accessibility are consistent for verified owner flow.
- [ ] Automated/DB/build and isolated browser gates pass; shared-dev integration, proxy/rollback, and production release gates remain.
