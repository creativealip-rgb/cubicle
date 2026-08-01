# Cubiqlo Invoice Entry Source Revision — Progress

**Date:** 2026-08-01

**Branch:** `main`

**Implementation commits:** `d3d4438`, `0c96988`

**Release status:** Source committed/pushed; production migration and deployment pending.

## Implemented

- Additive migration `0066_invoice_entry_source_revision.sql` adds `invoice_items.source_mode` and `source_metadata`, profiles duplicate Time Entry links, and preserves partial uniqueness.
- Explicit source contract covers Fixed full/DP/milestone/final, Hourly approved timesheet/deposit, and manual adjustments; generic Retainer period source remains excluded.
- Fixed source progress uses active invoice states and only Fixed source modes. Manual adjustments do not reduce remaining.
- Fixed creation uses sorted per-project transaction advisory locks and recalculates remaining under lock.
- Hourly creation locks selected Time Entries, validates workspace/client/project/status/billability/completion/duration/rate, applies inclusive/exclusive period boundaries, stores prior status, and verifies conditional status transition count.
- Hourly fallback date uses workspace timezone when `workDate` is absent.
- Draft cancellation locks invoice and restores Hourly sources conditionally in the same transaction while preserving invoice items for audit.
- Client Invoice tab has mobile-safe client-scoped creation. Global and Project scopes remain server-validated.
- Retainer invoice lines store `retainer_base`/`retainer_overage` intent and period/original-currency metadata while reusing existing period lifecycle.

## Verification evidence

- Targeted invoice tests passed before latest hardening: 24/24.
- Targeted ESLint passed.
- Next.js production build passed.
- Migration `0066` applied and replayed successfully on a disposable clone of `cubicle_dev`; expected columns/index verified and disposable DB removed.
- Full suite has four unrelated stale Task wiring failures caused by tests expecting `Move Up`/`Move Down` while UI labels are localized.
- `git diff --check` passed before implementation commits.

## Pending canonical-plan work

1. Fixed progress preview and safe default based on server-loaded prior history.
2. Eligible Time Entry picker/preview directly inside invoice form.
3. Retainer Project Invoice actions and period usage summary.
4. Behavioral PostgreSQL concurrency matrix for duplicate Hourly and parallel Fixed Final requests.
5. Desktop browser matrix across global/client/project entry points and cancellation flows.
6. Mobile QA at `390x844` with overflow, dialog reachability, and readable-error assertions.
7. DB reconciliation, fresh server logs, and bounded screenshots/evidence.
8. Production backup + checksum + restore test, migration ledger apply, image rebuild, guarded deployment, health/live QA.

## Deployment boundary

Production is not migrated or deployed. Before release, follow shared VPS guardrails: `dokploy-traefik` remains sole public 80/443 owner; create and restore-test a `cubicle` backup; apply `0066` with explicit production acknowledgment; recreate only `cubiqlo-new-app`; verify target and unrelated-domain routing.
