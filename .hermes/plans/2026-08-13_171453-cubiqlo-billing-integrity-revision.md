# Cubiqlo Billing Integrity Revision Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Menutup semua blocker billing Cubiqlo sehingga checkout, pembayaran, aktivasi, periode, add-on, expiry, UI, dan operasi cron konsisten serta terbukti di dev.

**Architecture:** Pertahankan satu payment ledger `pakasir_payments` dan satu activation path `activateCompletedPakasirPayment`. Semua checkout memakai workspace aktif, payer eksplisit, provider verification fail-closed, dan entitlement hanya dibuat sesudah payment `completed`. Karena QRIS Pakasir bukan mandate recurring charge, hapus renewal entitlement gratis: renewal menjadi explicit checkout baru; cron hanya expire/cancel, tidak memberi periode baru tanpa payment.

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM, PostgreSQL, Better Auth, Vitest, Pakasir QRIS, Docker/Dokploy dev.

**Baseline:** branch `fix/landing-id-headline-underline`, commit `8cd4862`. Preserve `docs/operations/evidence/ui-phase0-2026-08-12/` dan semua unrelated work.

**Canonical requirement:** `docs/plans/2026-08-11-cubiqlo-final-billing-storage-plan.md`. Plan revisi ini mengoreksi implementasi lifecycle yang tidak mungkin melakukan auto-charge QRIS. Jangan membuat entitlement renewal tanpa payment.

---

## 0. Completion ledger

| Finding | Target state |
|---|---|
| Storage add-on request ditolak sebelum branch add-on | fixed |
| Renewal add-on gratis | removed; explicit paid renewal |
| Extra-workspace renewal unique conflict | removed with free-renewal path |
| Checkout memakai membership acak | fixed; active workspace + owner |
| Payment tidak menyimpan payer | fixed via additive migration |
| Same-plan renewal/downgrade setelah expiry terkunci | fixed using effective plan + renewal window |
| Expiry tanggal akhir bulan overflow | fixed with clamped calendar arithmetic |
| Sweep race | fixed with row lock/conditional transition |
| Extra-workspace cancel UI tidak ada | fixed with entitlement rows |
| `cancel_scheduled` quota hilang terlalu awal | fixed |
| UI add-on yearly-only | fixed monthly/yearly selector |
| Team period selector tersembunyi | fixed |
| Harga/copy lama dan “hemat 2x” | fixed |
| Pending payment tidak expire | fixed |
| Cron tidak terjadwal | fixed on dev; production remains approval-gated |
| Real Pakasir proof | required on dev |

---

## Status update — 2026-08-13 (evidence log: `docs/operations/evidence/billing-revision-2026-08-13.md`)

Implementation commits: `a830939`, `23ab270`, `f5bb86f`, `8e93cc0`, `325bd32`, `1d7cb7d`, `147fcee`, `9c7a211`, `fa39564` (HEAD `fa39564`); dev integration merge `d1b1b55`.

| Gate | Status |
|---|---|
| A — Source | PASS — 104/104 + 71/71, lifecycle 23/23, scheduler 4/4, tsc/build/diff PASS |
| B — Migration | PASS — dev backup SHA-256 `0784f403…`, restore-test PASS, 0077 applied, defaults `false` in `cubicle_dev` |
| C — Dev deploy | PASS — source `d1b1b55`, image `sha256:65e…`, health ok/db ok, production unchanged |
| D — Acceptance | PARTIAL — browser login + billing toggles smoke PASS; provider runtime proof OPEN |
| E — Production | BLOCKED — 16 stale pending payments (provider 404); real payment/webhook/replay/cancel/expiry/browser DB proof not complete; requires explicit approval |

Runtime: live `pakasir-sync` scanned 16 pending rows; all 16 errored `Pakasir detail HTTP 404` (`Transaksi tidak ditemukan`). Dev health `{"status":"ok","db":"ok"}`. Production untouched. This status is appended; historical sections above remain factual.

---

## Phase 1 — Freeze invariants with failing tests

### Task 1: Add calendar-period edge-case tests

**Objective:** Pin monthly expiry for month-end and leap-year dates.

**Files:**
- Modify: `src/lib/billing-plans.test.ts`
- Modify: `src/lib/billing-plans.ts`

**RED cases:**
- `2026-01-31 + monthly = 2026-02-28`
- `2024-01-31 + monthly = 2024-02-29`
- `2026-03-31 + monthly = 2026-04-30`
- yearly leap-day behavior explicitly pinned.

**Implementation:** Clone start date, move to day 1, advance month/year, clamp original day to target month’s final UTC day. No dependency.

**Verify:**
```bash
npx vitest run src/lib/billing-plans.test.ts
```
Expected: RED before implementation, PASS after.

### Task 2: Replace broad wiring assertions with route behavior tests

**Objective:** Catch request-shape and branch-order bugs missed by string tests.

**Files:**
- Create: `src/app/api/billing/checkout/route.test.ts`
- Create: `src/app/api/billing/checkout-extra-workspace/route.test.ts`
- Keep: `src/lib/billing-checkout-wiring.test.ts`

**Cases:**
- `{ addon: 5, period: "monthly" }` reaches storage branch without requiring `plan`.
- `{ plan: "solo", period: "monthly" }` reaches plan branch.
- invalid addon/period returns 400 before provider.
- non-owner returns 403 before provider and DB insert.
- active workspace B is selected even when membership A was created first.
- missing/foreign active workspace returns 403/404, never fallback silently.
- expired paid user may purchase based on effective `free` state.

**Verify:**
```bash
npx vitest run src/app/api/billing/checkout/route.test.ts src/app/api/billing/checkout-extra-workspace/route.test.ts
```

---

## Phase 2 — Correct checkout identity and ledger

### Task 3: Resolve active workspace once

**Objective:** Remove every `.where(userId).limit(1)` checkout lookup.

**Files:**
- Modify: `src/app/api/billing/checkout/route.ts`
- Modify: `src/app/api/billing/checkout-extra-workspace/route.ts`
- Reuse: `src/lib/workspace.ts`

**Implementation:**
1. After auth + same-origin, call `getWorkspaceRecordForUser(session.user.id)`.
2. Query exact membership using `userId AND workspaceId`.
3. Require role `owner` before provider call.
4. Use exact workspace ID for order ID, payment row, redirect status, and owner activation.
5. Do not auto-create a workspace from billing. If helper auto-create semantics cannot be safely avoided, add a read-only `getActiveWorkspaceRecordForUser` helper that never creates.

**Acceptance:** active cookie determines charged workspace; no arbitrary fallback.

### Task 4: Add payer identity to payment ledger

**Objective:** Make payer and entitlement recipient auditable.

**Files:**
- Create: `drizzle/0076_pakasir_payment_payer.sql`
- Modify: `src/db/schema.ts`
- Modify: both checkout routes
- Modify: `src/lib/pakasir-sync.ts`
- Test: `src/lib/pakasir-sync-wiring.test.ts`

**Migration:**
- Add nullable `user_id text REFERENCES users(id) ON DELETE SET NULL`.
- Backfill historical rows from `workspaces.owner_id`.
- Make `user_id NOT NULL` only after backfill verification.
- Add index `pakasir_payments_user_id_idx`.
- Add no destructive changes.

**Activation invariant:** locked payment’s `userId` must equal current workspace owner for owner-billed products. Mismatch returns a non-activating result and logs server-side; never silently transfer entitlement.

**Verify migration on disposable DB first.**

### Task 5: Split plan and add-on input parsing

**Objective:** Storage add-on checkout no longer requires a plan field.

**Files:**
- Modify: `src/app/api/billing/checkout/route.ts`
- Test: `src/app/api/billing/checkout/route.test.ts`

**Implementation:** Parse common `period`, then branch on presence of `addon`. Validate `plan` only in plan branch. Use Zod only if already available in route conventions; otherwise minimal explicit validators.

**Security:** Preserve auth, same-origin, owner check, provider check, random order ID, server-derived amount.

---

## Phase 3 — Replace free renewal with paid lifecycle

### Task 6: Define explicit QRIS renewal states

**Objective:** Remove unsupported auto-charge semantics.

**Files:**
- Modify: `src/lib/storage-addons.ts`
- Modify: `src/lib/extra-workspace.ts`
- Modify: `src/db/schema.ts` defaults if needed
- Create: `drizzle/0077_disable_unfunded_addon_autorenew.sql`
- Modify: canonical plan section 1.3/1.4 and handoff status

**Decision:**
- New entitlements default `autoRenew=false` unless a future provider mandate exists.
- Expired `active` entitlement becomes `expired`.
- Expired `cancel_scheduled` becomes `cancelled`.
- Sweep never inserts a new entitlement.
- User renews by creating a new checkout/payment; verified completion creates a new entitlement.
- Existing rows with `auto_renew=true` are backfilled to false to prevent free renewal.

**Do not:** simulate recurring billing, clone amount/provider IDs, or grant grace entitlement without payment.

### Task 7: Make sweeps concurrency-safe

**Objective:** Parallel cron calls produce one terminal transition.

**Files:**
- Modify: `src/lib/storage-addons.ts`
- Modify: `src/lib/extra-workspace.ts`
- Create or extend lifecycle unit/integration tests

**Implementation:** Select due rows in transaction with `FOR UPDATE SKIP LOCKED`, or perform conditional updates with `WHERE id=? AND status IN (...) AND ends_at<=now()`. Count only rows actually returned by update. No insertion.

**Cases:** two concurrent sweeps; final state terminal once, zero duplicate rows.

### Task 8: Support paid plan renewal and effective-plan purchasing

**Objective:** Expired users and same-plan renewals can pay correctly without downgrade/replay hazards.

**Files:**
- Modify: `src/app/api/billing/checkout/route.ts`
- Modify: `src/lib/pakasir-sync.ts`
- Test: checkout route + activation tests

**Rules:**
- Use `getEffectivePlan(user.plan, user.planExpiresAt, now)` for purchase eligibility.
- Active same-plan renewal allowed only within a defined renewal window (recommended 30 days before expiry) or after expiry; otherwise 409.
- Expired Team effectively Free may buy Solo or Team.
- Activation start = `max(providerPaidAt, current planExpiresAt)` only for same-tier early renewal; upgrades start at paid time.
- Old lower-tier pending order must never downgrade a currently effective higher tier. Mark it mismatch/ignored and require manual reconciliation/refund.
- Never trust plan/tier from webhook body; use locked DB row.

**Test matrix:** Free→Solo, Free→Team, active Solo→Team, active Solo→Solo early renewal, expired Team→Solo, stale Solo order after Team activation, duplicate completion.

### Task 9: Expire stale pending payments

**Objective:** QRIS pending rows stop showing “waiting” forever.

**Files:**
- Modify: `src/db/schema.ts` payment status enum
- Create: `drizzle/0078_payment_expiry_status.sql`
- Modify: `src/lib/pakasir-sync.ts`
- Modify: `src/lib/billing-checkout-status.ts`
- Tests: sync and status tests

**Implementation:** Add `expired` status and optional `expires_at`. Persist provider expiry when transaction is created. Sync marks provider-expired rows `expired`; local fallback may expire rows only when provider confirms non-completed/expired. Never expire solely from local clock if provider status is reachable and completed.

---

## Phase 4 — Entitlement and quota enforcement

### Task 10: Count owned workspaces, not memberships

**Objective:** Extra workspace slots reflect ownership.

**Files:**
- Modify: `src/lib/extra-workspace.ts`
- Modify: `src/lib/actions/workspace-switch.ts`
- Tests: `src/lib/addon-lifecycle-wiring.test.ts` plus behavior test

**Implementation:** Count `workspaces.ownerId = userId`; do not count member/viewer rows. `getUserWorkspaces()` must use `canCreateWorkspaceWithAddons`, same as mutation.

### Task 11: Keep cancel-scheduled storage active through period end

**Objective:** Quota does not drop immediately after cancellation.

**Files:**
- Modify: `src/lib/storage-quota.ts`
- Test: storage quota tests

**Query:** Include statuses `active` and `cancel_scheduled`, plus `endsAt > now`. Preserve workspace-scoped owner/member entitlement semantics.

### Task 12: Add extra-workspace entitlement list and cancel UI

**Objective:** User can see and cancel each purchased slot.

**Files:**
- Add list helper in `src/lib/extra-workspace.ts`
- Modify: `src/lib/actions/billing-addons.ts`
- Modify: `src/components/billing/addon-management.tsx`
- Modify: `src/app/(app)/app/billing/page.tsx`
- Tests: lifecycle/action/component behavior

**UI fields:** quantity, period, amount, endsAt, status, cancel button. Disable cancel when `cancel_scheduled`; show “active until …”. Pass entitlement IDs, not aggregate count only.

### Task 13: Reserve pending invite slots

**Objective:** Team member limit includes unaccepted invites.

**Files:** inspect actual invite persistence first.
- Likely modify: `src/lib/actions/team.ts`, `src/lib/plan.ts`, `src/db/schema.ts`
- Create additive migration only if no invite table exists.

**Rule:** owner counts as member; accepted members + non-expired pending invites cannot exceed 5. One authoritative invite path; remove or delegate dead `inviteMember` path in `workspace-members.ts` to shared implementation.

---

## Phase 5 — Billing UI and copy truth

### Task 14: One shared period selector

**Objective:** Plan and add-on checkout support visible monthly/yearly selection.

**Files:**
- Modify: `src/components/billing/checkout-button.tsx`
- Modify: `src/components/billing/addon-purchase-controls.tsx`
- Modify: `src/app/(app)/app/billing/page.tsx`
- Tests: component behavior, not string-only wiring

**Rules:**
- Team selector remains visible.
- Add-ons use same `cubiqlo:billing:period` key and react to current value.
- Show exact monthly and yearly amounts.
- Remove “hemat 2x”; annual price has no discount.
- Checkout body period must equal visible selected period.

### Task 15: Render effective subscription status truthfully

**Objective:** Expired raw paid tier is not labeled active.

**Files:**
- Modify: billing page and status component

**Rules:** Show stored plan as historical/subscription tier if needed, effective plan as active entitlement. Enable checkout when effective plan permits purchase.

### Task 16: Remove stale prices everywhere

**Objective:** No UI advertises Rp588rb/Rp1,188jt.

**Files:**
- `src/components/app-topbar.tsx`
- `src/app/(app)/app/clients/page.tsx`
- `src/app/(app)/app/projects/page.tsx`
- `src/app/(app)/app/docs/workspace-settings/page.tsx`
- `src/app/page.tsx`
- Related wiring tests, including `docs-shell-wiring.test.ts` and `billing-plan-copy-wiring.test.ts`

**Source:** import/derive from `BILLING_PLANS` where server/client boundary permits; otherwise centralized client-safe formatter. Search entire `src/` for `588`, `1,188`, `1.188`, `Rp 588`, `Rp588`.

### Task 17: Show workspace storage usage beside add-ons

**Objective:** Purchased quota effect is visible.

**Files:**
- Modify billing page using `getWorkspaceStorageQuota(activeWorkspaceId)` and workspace file usage.
- Do not use user-scoped `getStorageAddOnUsage()` for workspace card.

**UI:** used / max / available; active workspace name; update after upload/delete/cancel via relevant revalidation.

---

## Phase 6 — Operational scheduler and runtime proof

### Task 18: Add scheduler scripts and docs

**Objective:** `pakasir-sync` and `expire-plans` run automatically in dev.

**Files:**
- Create: `scripts/cron-pakasir-sync.sh`
- Create or update: `scripts/cron-expire-plans.sh`
- Create: `docs/operations/billing-cron.md`
- Add wiring tests following existing storage reconcile scheduler pattern.

**Requirements:**
- Load only required URL + `CRON_SECRET`.
- Bearer auth.
- Explicit dev URL default.
- Production execution refuses unless `ALLOW_PRODUCTION_BILLING_CRON=1`.
- Suggested intervals: sync every 5 minutes; expire/lifecycle hourly.
- Scheduler installation on production requires explicit approval.

### Task 19: Apply migrations to exact dev DB safely

**Objective:** Prove 0076–0078 against `cubiqlo-new-pg/cubicle_dev`.

**Prerequisites:** Before deployment read:
- `/root/.hermes/shared-workspace/DEPLOYMENT_GUARDRAILS.md`
- `/root/.hermes/shared-workspace/DEPLOY_RULES.md`

**Sequence:**
1. Inspect live `cubicle-dev` `DATABASE_URL`.
2. `pg_dump -Fc`, save SHA-256.
3. Restore-test dump into disposable DB.
4. Run `scripts/migrate-ledger.sh` with explicit `DB_CONTAINER`, `DB_NAME`, `DB_USER`.
5. Verify ledger, columns, constraints, indexes, payer backfill, and no invalid rows.
6. Run `/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh` from project directory before dev deploy.

### Task 20: Dev deploy and browser/provider QA

**Objective:** Produce real acceptance evidence, not source-only confidence.

**Environment:** dev only. Production untouched.

**Flows:**
1. Solo monthly checkout: amount, QRIS redirect, pending row, completed webhook/sync, expiry.
2. Team yearly checkout.
3. Storage +5 GB monthly and yearly.
4. Extra workspace monthly; slot increase; create at boundary.
5. Cancel storage and extra workspace; entitlement remains until end.
6. Simulated period-end on disposable fixture: terminal transition, no free entitlement.
7. Missed webhook recovered by sync.
8. Replay same webhook: no duplicate activation.
9. Foreign workspace/order ID hidden.
10. Multi-workspace owner: active workspace charged.
11. Expired Team can purchase Solo.
12. Month-end expiry cases validated in DB.
13. Browser reload persistence, console clean, fresh server logs.

**Provider safety:** Use authorized low-value dev transactions. Record provider order ID, DB row, amount, status, entitlement ID, and cleanup/reconciliation. Never fabricate completed provider responses as acceptance proof.

---

## Phase 7 — Gates

### Gate A: Focused source

```bash
npx vitest run \
  src/lib/billing-plans.test.ts \
  src/app/api/billing/checkout/route.test.ts \
  src/app/api/billing/checkout-extra-workspace/route.test.ts \
  src/lib/billing-checkout-wiring.test.ts \
  src/lib/billing-checkout-status-wiring.test.ts \
  src/lib/pakasir-webhook-atomicity.test.ts \
  src/lib/pakasir-sync-wiring.test.ts \
  src/lib/addon-lifecycle-wiring.test.ts \
  src/lib/entitlement-lifecycle-wiring.test.ts \
  src/lib/addon-purchase-controls-wiring.test.ts \
  src/lib/billing-plan-copy-wiring.test.ts \
  src/lib/same-origin.test.ts
npx tsc --noEmit
git diff --check
npm run build
```

### Gate B: Migration

PASS only with dev backup, restore-test, ledger rows, schema constraints, payer backfill, and app-role access.

### Gate C: Runtime

PASS only after latest intended source is deployed to `cubicle-dev`, health+DB OK, `dokploy-traefik` remains sole public 80/443 owner, and production container/image unchanged.

### Gate D: Acceptance

PASS only after real provider checkout/webhook/sync, replay idempotency, cancel/expiry, multi-workspace scoping, and UI persistence evidence.

### Gate E: Production

**BLOCKED** until Gates A–D PASS and Alip gives explicit production approval.

---

## Risks and rollback

- **Payment migration:** additive only. Roll back code first; retain payer/status columns.
- **Existing `auto_renew=true`:** disabling prevents revenue leakage but changes promised behavior. Surface explicit “renew manually” UI before migration deploy.
- **Pending historical rows:** never bulk-complete. Provider re-fetch each row; mark expired only with verified evidence.
- **Old paid orders:** tier guard may leave paid-but-not-activated rows needing manual refund/reconciliation. Report IDs without exposing raw payload/secrets.
- **Concurrent work:** billing hot spots `schema.ts`, checkout, webhook/sync, migrations. Serialize ownership; re-read before every write.
- **Production:** no migration, restart, cron install, deploy, or payment mutation without explicit approval.

## Definition of done

Billing is “berfungsi” only when:
- source, typecheck, build pass;
- dev schema matches code;
- no entitlement appears without completed payment;
- active workspace and payer are exact;
- period/amount/expiry match UI and DB;
- lifecycle cron is scheduled and observed;
- real Pakasir payment, missed-webhook recovery, replay, cancel, expiry, and UI persistence pass;
- all stale pricing is gone;
- production remains untouched until approved.
