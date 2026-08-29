# Cubiqlo Production Hardening Implementation Plan

> **For Hermes:** Execute continuously task-by-task. Preserve unrelated work. Use TDD, focused commits, then full verification. Production deploy requires explicit approval and VPS deployment guardrails.

**Goal:** Close confirmed security, tenant-isolation, financial-integrity, time-entry race, quality-gate, and mobile UX gaps before broad public launch.

**Architecture:** Keep existing Next.js App Router + Drizzle/PostgreSQL design. Harden trust boundaries with authenticated resource resolution, workspace predicates, Zod/DB constraints, and short PostgreSQL transactions using row locks. Reuse existing download, file-validation, invoice-rule, access-control, and dialog primitives; no new dependency unless unavoidable.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, PostgreSQL 16, Better Auth, Redis, Vitest, Playwright, Docker, Dokploy Traefik.

**Baseline:** `main` at `b1ae27b`; production health/DB OK; build PASS; lint 0 errors/28 warnings; tests 1540/1543 PASS; npm audit 2 high/3 moderate; 33 authenticated routes HTTP 200.

---

## Status ledger

| Phase | Scope | Status |
|---|---|---|
| P0-A | Private file authorization | PASS |
| P0-B | Upload content validation | PASS |
| P0-C | Invoice tenant integrity | PASS |
| P0-D | Atomic payment/status flows | PASS |
| P1-A | Time-entry/invoice races | PASS |
| P1-B | Task/project mutation validation | PASS |
| P1-C | Atomic invoice totals | PASS |
| P1-D | Tests, dependencies, lint | PASS |
| P2 | Mobile, i18n, loading, docs | PASS |
| Release | Full QA, deploy, live proof | PASS |

## Execution rules

1. Work P0 in listed order. No UX work before security/accounting gates pass.
2. Every code task: RED test → minimal implementation → GREEN targeted test → commit.
3. Do not mutate production DB directly. Production fixture creation/cleanup must use UI.
4. Never delete or rewrite payment rows for QA cleanup.
5. Migration must be additive, transaction-safe, registered in `docs/migration-registry.md`, and rehearsed before production.
6. Deploy only after reading `DEPLOYMENT_GUARDRAILS.md` + `DEPLOY_RULES.md` and running `PRE_DEPLOY_CHECK.sh`.

---

## Phase P0-A — Private file authorization

### Task 1: Define raw-file access contract

**Objective:** Prove unauthenticated storage-key access is denied while authorized workspace and portal access remain valid.

**Files:**
- Modify: `src/app/api/files/raw/[...key]/route.ts`
- Modify: `src/lib/document-blocks.ts`
- Test: `src/lib/public-token-wiring.test.ts`
- Test: create `src/lib/raw-file-authorization-wiring.test.ts`

**Steps:**
1. Write failing tests asserting raw route resolves `files` row before object read and requires session/workspace or valid portal access.
2. Assert random key and foreign-workspace key return `404`, not ownership detail.
3. Assert `document-blocks.ts` uses file ID protected download URL, not `storageKey` raw URL.
4. Run:
   ```bash
   npm test -- --run src/lib/raw-file-authorization-wiring.test.ts src/lib/public-token-wiring.test.ts
   ```
   Expected: FAIL before implementation.
5. Implement smallest authorization path using existing `files`, `getWorkspaceId`, membership, and portal-token helpers.
6. Force `Content-Disposition: attachment` for non-preview-safe files and `X-Content-Type-Options: nosniff`.
7. Re-run tests. Expected: PASS.
8. Commit:
   ```bash
   git add src/app/api/files/raw src/lib/document-blocks.ts src/lib/*file*test.ts
   git commit -m "fix: authorize raw file access"
   ```

**Acceptance:** Knowing `storageKey` alone never grants access; existing authenticated downloads still work.

---

## Phase P0-B — Upload content validation

### Task 2: Harden Personal Site uploads

**Objective:** Reject spoofed MIME, unsafe extension, and extension/content mismatch before R2 or local write.

**Files:**
- Modify: `src/app/api/site/upload/route.ts`
- Modify: `src/app/api/site/image/[filename]/route.ts`
- Reuse: `src/lib/file-validation.ts`
- Test: `src/app/api/site/upload/route.test.ts`
- Test: `src/lib/upload-safety.test.ts`

**Steps:**
1. Add failing tests: valid PNG/JPEG/WebP/GIF pass; HTML-as-PNG, SVG, JS, arbitrary extension, malformed bytes fail.
2. Run targeted tests; expected FAIL.
3. Call existing magic-byte validator before generating key or writing bytes.
4. Derive extension/MIME from validated bytes, not user filename/type.
5. Apply identical rules to R2 and local fallback.
6. Add `nosniff`; prevent inline serving of unsupported types.
7. Run targeted tests; expected PASS.
8. Commit `fix: validate personal site upload bytes`.

### Task 3: Enforce request body limits

**Objective:** Reject oversized portal multipart requests before `formData()` exhausts memory.

**Files:**
- Modify: `src/app/api/client-portal/files/upload/route.ts`
- Modify: `src/app/api/client-portal/requests/upload/route.ts`
- Modify only if needed: Traefik/Dokploy middleware config through approved deployment path
- Test: `src/lib/upload-safety-wiring.test.ts`

**Steps:**
1. Add tests for missing/spoofed `Content-Length`, aggregate multipart size, and valid upload.
2. Add route preflight limits and platform/proxy request-body cap. Keep existing per-file checks.
3. Verify `413` for oversized payload and no DB/R2 write.
4. Commit `fix: cap portal upload request bodies`.

---

## Phase P0-C — Invoice tenant integrity

### Task 4: Bind invoice client/project updates to workspace

**Objective:** Prevent cross-workspace and client/project-inconsistent invoice relations.

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Reuse: `src/lib/tenant-reference-rules.ts`
- Test: `src/lib/tenant-reference-rules.test.ts`
- Test: `src/lib/tenant-boundary-wiring.test.ts`
- Test: create `src/lib/invoice-update-tenant-integrity.test.ts`

**Steps:**
1. Add failing cases: foreign client, foreign project, project owned by different client, valid same-workspace relation.
2. Run targeted tests; expected FAIL.
3. Before update, validate `clientId` with `assertClientInWorkspace`.
4. If invoice has/project receives `projectId`, validate same workspace and client relation.
5. Add workspace predicate to final update query.
6. Return human safe error, not Server Components digest.
7. Run tests; expected PASS.
8. Commit `fix: enforce invoice tenant references`.

**Acceptance:** Invoice cannot reference client/project outside active workspace or contradictory client/project pair.

---

## Phase P0-D — Atomic payment and invoice status flows

### Task 5: Make payment recording atomic

**Objective:** Prevent concurrent overpayment.

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Modify if needed: `src/lib/invoice-payment-rules.ts`
- Test: `src/lib/invoice-payment-rules.test.ts`
- Test: `src/lib/invoice-concurrency-safety.test.ts`
- Integration test: `src/lib/integration/invoice-payment.postgres.test.ts`

**Steps:**
1. Add PostgreSQL concurrency test issuing two payments whose combined amount exceeds remaining balance.
2. Expected RED: both can currently succeed.
3. Move invoice lock, paid-sum query, finite/positive validation, remaining check, and insert into one transaction.
4. Lock invoice with `FOR UPDATE`; scope by `id + workspaceId`.
5. Ensure exactly one concurrent request succeeds and final paid sum never exceeds total.
6. Run targeted + integration tests; expected PASS.
7. Commit `fix: serialize invoice payment recording`.

### Task 6: Make mark-paid atomic

**Objective:** Never store `paid` without matching payment ledger state.

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Test: `src/lib/invoice-status-transition-wiring.test.ts`
- Test: `src/lib/invoice-concurrency-safety.test.ts`

**Steps:**
1. Add failure-injection and concurrent mark-paid tests.
2. Put lock, paid-total read, synthetic payment insert, and status update in one transaction.
3. Make operation idempotent: repeated call creates no duplicate synthetic payment.
4. Run targeted tests; expected PASS.
5. Commit `fix: make invoice paid transition atomic`.

### Task 7: Re-check void state under lock

**Objective:** Prevent voiding an invoice after payment arrives concurrently.

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Test: `src/lib/invoice-void-flow-wiring.test.ts`
- Test: `src/lib/invoice-concurrency-safety.test.ts`

**Steps:**
1. Add race test: payment and void overlap.
2. Inside one transaction lock invoice, re-read payment aggregate, apply transition policy, conditional update.
3. Preserve payment rows and audit reason.
4. Expected: paid/partially-paid invoice follows supported void policy only; stale check cannot cancel it accidentally.
5. Commit `fix: lock invoice void transitions`.

---

## Phase P1-A — Time-entry and invoicing races

### Task 8: Use `workDate` for manual-entry week locks

**Objective:** Apply timesheet lock to worked week, not row creation week.

**Files:**
- Modify: `src/lib/actions/time.ts`
- Test: `src/lib/timesheet-lifecycle.test.ts`
- Test: `src/lib/time-entry-model.test.ts`

**Steps:**
1. Add manual entry created this week but worked in locked prior week.
2. Expected RED: edit currently allowed.
3. Resolve lock date from `workDate`; use `startTime` only for timer entries.
4. Run tests; expected PASS.
5. Commit `fix: lock manual time by work date`.

### Task 9: Serialize time edit vs invoice import

**Objective:** Prevent editing a time entry after it becomes invoiced.

**Files:**
- Modify: `src/lib/actions/time.ts`
- Modify: `src/lib/actions/invoices.ts`
- Test: `src/lib/invoice-concurrency-safety.test.ts`
- Integration test: `src/lib/integration/time-invoice-race.postgres.test.ts`

**Steps:**
1. Add concurrent update/import test.
2. Lock selected time rows during import and use conditional state transition `approved → invoiced`.
3. Edit path locks row and conditionally updates only editable statuses.
4. Add/verify unique source invariant for imported time entries. If missing, create additive migration and register it.
5. Run tests; expected only one state transition wins without double billing.
6. Commit `fix: serialize time invoice transitions`.

### Task 10: Confirm and harden timer stop policy

**Objective:** Make stop behavior explicit and race-safe.

**Decision gate:** Preserve current automatic `approved` behavior only if product policy confirms self-approval. Otherwise stop into `draft`/`submitted` according to workspace workflow.

**Files:**
- Modify: `src/lib/actions/time.ts`
- Test: `src/lib/timer-phase5-wiring.test.ts`
- Test: `src/lib/timesheet-lifecycle.test.ts`

**Steps:**
1. Encode chosen policy in test.
2. Conditional update requires active/open timer and current user.
3. Double stop: one success, one safe no-op/error.
4. Commit `fix: guard timer stop transition`.

---

## Phase P1-B — Mutation validation

### Task 11: Validate task status at app and DB boundaries

**Objective:** Reject arbitrary task status strings.

**Files:**
- Modify: `src/lib/actions/tasks.ts`
- Modify: `src/db/schema.ts`
- Create migration if DB check absent: `drizzle/*.sql`
- Modify: `docs/migration-registry.md`
- Test: `src/lib/billing-aware-task-actions.test.ts`
- Test: `src/lib/project-task-reorder-wiring.test.ts`

**Steps:**
1. Add invalid-status tests for direct update and reorder.
2. Replace `string`/`as any` with shared Zod enum.
3. Add DB check constraint after profiling existing values.
4. Rehearse migration against disposable DB.
5. Run tests/build.
6. Commit `fix: constrain task status mutations`.

### Task 12: Validate project member target workspace

**Objective:** Prevent adding foreign users to project membership.

**Files:**
- Modify or delete if dead: `src/lib/actions/projects.ts`
- Test: `src/lib/tenant-boundary-wiring.test.ts`

**Steps:**
1. Confirm function has no active caller.
2. YAGNI choice: delete dead action, or add workspace-member assertion if retained.
3. Add negative test.
4. Commit `fix: guard project member assignment`.

### Task 13: Scope final mutations by workspace

**Objective:** Remove assertion-to-update defense gaps.

**Files:**
- Modify targeted actions only: `contracts.ts`, `projects.ts`, `tasks.ts`, `files.ts`, `invoices.ts`
- Test: existing tenant boundary/wiring suites

**Steps:**
1. Add wiring tests requiring `id + workspaceId` predicates.
2. Patch final update/delete queries without refactor.
3. Run tenant tests.
4. Commit `fix: scope resource mutations to workspace`.

---

## Phase P1-C — Atomic invoice totals and sources

### Task 14: Recalculate totals inside item transactions

**Objective:** Keep items and invoice totals consistent under concurrent mutations.

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Test: `src/lib/invoice-finance-rules.test.ts`
- Test: `src/lib/invoice-concurrency-safety.test.ts`

**Steps:**
1. Add concurrent add/update/delete item test.
2. Introduce transaction-local total recalculation helper; do not call exported Server Action recursively.
3. Lock invoice and update totals in same transaction as item mutation.
4. Scope all reads/writes to workspace.
5. Run tests; expected persisted total equals line-item aggregate.
6. Commit `fix: update invoice totals atomically`.

### Task 15: Protect time-entry import uniqueness

**Objective:** Prevent same approved time entry entering two invoices.

**Files:**
- Modify: `src/lib/actions/invoices.ts`
- Modify schema/migration only if unique invariant absent
- Test: `src/lib/hourly-invoice-integrity-phase6.test.ts`
- Integration: `src/lib/integration/time-invoice-race.postgres.test.ts`

**Steps:**
1. Profile duplicate existing source rows read-only.
2. Add conditional transition and unique invariant.
3. Test concurrent imports into separate invoices.
4. Commit `fix: prevent duplicate time invoice sources`.

---

## Phase P1-D — Quality gates

### Task 16: Fix three stale/failing tests

**Objective:** Restore full suite without weakening behavior.

**Files:**
- Modify: `src/lib/auth-recurring-qa-wiring.test.ts`
- Modify: `src/lib/invoice-page-actions-wiring.test.ts`
- Modify test or renderer after product-contract check: `src/components/site/personal-site-renderer.test.tsx` / renderer

**Steps:**
1. Update recurring toast expectation to current copy.
2. Update invoice create assertion to current dialog trigger, not retired link.
3. Resolve Personal Site CTA contract: external CTA remains optional; preserve user-authored safe URL only when CTA enabled/rendered.
4. Run full `npm test`; expected 1543/1543 or higher PASS.
5. Commit `test: align regression suite with current UI`.

### Task 17: Patch dependency vulnerabilities safely

**Objective:** Reach zero high/critical advisories without force upgrades.

**Files:** `package.json`, `package-lock.json`

**Steps:**
1. Update `next` and `eslint-config-next` together within Next 16.
2. Update `postcss`; refresh transitive `brace-expansion`, `nanoid`, and `vite` through compatible parents/overrides only if necessary.
3. Never run `npm audit fix --force`.
4. Run `npm audit --omit=dev`, full tests, lint, build.
5. Acceptance: 0 high/critical; document any remaining moderate dev-chain issue.
6. Commit `chore: patch vulnerable dependencies`.

### Task 18: Clear lint warnings

**Objective:** Reach 0 errors/0 warnings without behavior changes.

**Files:** exact warning files from fresh lint output.

**Steps:**
1. Remove unused symbols mechanically.
2. For `useEffect` warnings, stabilize callback or restructure effect; do not blindly add dependencies causing loops.
3. Run lint after each small batch.
4. Run full tests + build.
5. Commit `chore: clear lint warnings`.

---

## Phase P2 — Product polish

### Task 19: Fix invalid `/app/clients/null` prefetch

**Objective:** Never render/prefetch null client links.

**Files:** likely project/contract list/detail components; confirm exact source before edit.

**Steps:** reproduce with Playwright request logging → patch conditional link → add test → verify no request.

### Task 20: Improve mobile action targets and dialog shells

**Objective:** Keep primary actions visible and touch targets ≥44px.

**Files:**
- `src/components/invoices/recurring-invoice-manager.tsx`
- `src/components/expenses/recurring-manager.tsx`
- `src/components/time/add-time-log-dialog.tsx`
- `src/components/time/manual-entry-form.tsx`
- invoice delete/share controls
- onboarding invite removal

**Steps:** fixed header/footer + scroll body; target sizes; desktop/mobile Playwright at 1440×1100 and 390×844; keyboard-height check.

### Task 21: Contract signing accessibility and i18n

**Objective:** Bilingual public signing flow with usable mobile/fallback controls.

**Files:** `signature-pad.tsx`, contract preview, `not-found.tsx`.

**Steps:** translate copy; programmatic canvas label/instructions; disable invalid submit; provide typed-name fallback; test mobile and keyboard.

### Task 22: Loading boundaries and proposal validation

**Objective:** Remove blank transitions and confusing validation.

**Steps:**
1. Add loading boundaries only to user-facing data-heavy routes proven slow; skip redirect-only legacy routes.
2. Validate proposal description, finite positive quantity, and nonnegative/positive pricing at UI and server schema.
3. Show one actionable error per invalid item.

### Task 23: Complete plan reminders

**Objective:** Send real renewal reminder emails with dedupe/idempotency.

**Files:** `src/app/api/cron/plan-reminders/route.ts`, notification/email helper, tests.

**Steps:** define idempotency key by user+expiry+days-before; send through Resend; log provider failure without marking sent; test cron rerun.

### Task 24: Reconcile docs

**Objective:** One factual current status source.

**Files:**
- Clean: `docs/qa-report-2026-08-22-cubiqlo-release.md`
- Update: `docs/bugs-manual-qa.md`
- Update this plan ledger

**Steps:** remove embedded tool noise; mark stale findings fixed/verified/open with evidence; do not rewrite historical evidence.

---

## Release Gate

### Task 25: Full local verification

Run:
```bash
git diff --check
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Expected:
- lint: 0 errors, 0 warnings
- tests: all pass
- build: exit 0
- audit: 0 critical/high
- git diff: clean formatting

### Task 26: Isolated concurrency and migration proof

- Run PostgreSQL integration tests against disposable QA DB.
- Rehearse every new migration and rollback/recovery instructions.
- Prove concurrent payment, mark-paid, void, invoice item, and time import invariants.
- No production mutation.

### Task 27: Production-safe browser QA

Use one authenticated context, `workers=1`, `retries=0`:
- authorized/unauthorized file access
- spoofed upload rejection
- invoice client/project tenant validation
- invoice create, partial payment, remaining amount, report persistence
- recurring/custom numbering regression
- time edit/import state boundary
- task status normal flow
- mobile dialogs/signature
- cleanup through UI, then read-only DB zero-prefix proof

### Task 28: Deploy after explicit approval

1. Read shared deployment guardrails/rules.
2. Run `PRE_DEPLOY_CHECK.sh`.
3. Back up env and DB per existing procedure.
4. Build SHA-tagged image.
5. Replace only routed app container; preserve env, mounts, network alias, and labels.
6. Verify:
   - container readiness
   - `/api/health`: app + DB OK
   - canonical route
   - auth/cron guards
   - focused browser E2E
   - `dokploy-traefik` remains sole 80/443 owner
7. Update plan ledger and deployment log.

---

## Definition of done

- Storage key alone cannot access private files.
- Every upload validates actual bytes and request size.
- Invoice client/project references cannot cross tenant or contradict each other.
- Concurrent payment never overpays; paid/void transitions are atomic/idempotent.
- Invoiced time cannot be edited or imported twice.
- Task statuses and project members are validated at server/DB boundaries.
- Invoice totals equal persisted line items after concurrent operations.
- Tests, lint, build, dependency audit all meet release gate.
- Desktop/mobile E2E passes with persistence/log/DB evidence and zero QA leftovers.
- Production deploy has health, route, image, proxy, and regression proof.

## Implementation ledger — 2026-08-29

- PASS: private raw-file authorization and protected document download URLs.
- PASS: Personal Site byte-signature validation, safe extension derivation, and `nosniff`.
- PASS: invoice tenant references; atomic payment, mark-paid, void, item totals, and time import paths.
- PASS: task status app validation; migration `0082` adds DB check and passed disposable PostgreSQL 16 rehearsal.
- PASS: timer stop conditional transition, time edit guard, workspace-scoped target mutations.
- PASS: null-client link guard, proposal numeric validation, recurring dialog shell, signing labels/touch targets.
- PASS: plan-expiry email delivery through shared Resend helper with sent/failed reporting.
- PASS: dependency audit and lint gate.
- PASS RELEASE: migration `0082` applied to production; current image `cubiqlo-prod:sha-d79c7792279de1a68f39b80ff13ce97cd0700c30` live.
- PASS RELEASE: internal/public health and DB OK; login/root HTTP 200; cron/env auth guards 401; no fresh server errors.
- PASS RELEASE: authenticated mobile QA at 390×844 passed dashboard, invoices, proposals, contracts, and weekly time with zero overflow/console errors.
- PASS RELEASE: `dokploy-traefik` remains sole 80/443 owner; app stays internal on `dokploy-network`.
- EVIDENCE: DB backup `/root/backups/cubiqlo/db/cubicle-20260829T112933Z-pre-0082.dump`; release manifest `/root/releases/cubiqlo/2026-08-29T11-37-24Z-998795c377f0.env`.
- PASS FOLLOW-UP: portal upload bodies enforce both declared and streamed aggregate limits before multipart parsing; oversized chunked bodies return `413`.
- PASS FOLLOW-UP: contract signing supports draw and typed-name fallback through one PNG validation/signing path.
- PASS FOLLOW-UP: plan reminder sends use stable provider idempotency key `user + expiry + days-before`.
- PASS FOLLOW-UP: 39 user-facing loading boundaries are present; proposal validation and invoice timesheet period validation are active.
- PASS FOLLOW-UP: hydration matrix 24/24 and client → project → task → approved time → invoice chain passed; UI cleanup and read-only DB zero-prefix proof completed.
