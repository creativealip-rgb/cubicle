# Cubiqlo Invoice Entry Source Revision — Progress

**Date:** 2026-08-01

**Branch:** `main`

**Implementation commits:** `d3d4438`, `0c96988`, `2efcc9b`

**Release status:** Source committed/pushed; production migration and deployment complete.

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

## Completed continuation evidence

- Fixed progress preview loads agreed/prior/remaining in original project currency; defaults `fixed_full` without active history and `fixed_final` with history.
- Hourly source includes `[start,end)` eligible Time Entry picker, selected minutes/value preview, and stale-selection resets.
- Retainer Project Invoice exposes period lifecycle action, manual/deposit action, and period usage/overage summary.
- Targeted invoice/Retainer/concurrency tests pass: 24/24.
- Behavioral PostgreSQL concurrency proof on disposable `cubicle_invoice_test`: Hourly 1 success/1 failure/1 link/status invoiced; parallel Fixed Final `[100000,0]`, active total `100000` equals agreed amount. Disposable DB removed.
- Full suite: 800/803 pass; three stale unrelated Task wiring assertions remain. Full ESLint and production build pass.
- Isolated QA image `cubiqlo-invoice-source-qa:20260801` runs on localhost `3201` against `cubicle_dev`; production app/DB untouched.
- `cubicle_dev` backup `/tmp/cubicle_dev_pre0066_20260801T213934.dump` checksum `5e6f105f6ff789e0675261fbc27c7cb37d0460c5f3c34e6e6960d46050e6e8d9`; migration `0066` applied and columns/index verified.
- Desktop/global/client/project Fixed/Hourly/Retainer and mobile `390x844` matrix: 25/25 assertions pass; screenshots stored under `docs/qa-screenshots/invoice-source-revision/`.
- DB reconciliation: 57 Time Entry links, 57 distinct sources, zero duplicates.
- Existing project pages for Hourly/Retainer emit React hydration error `#418`; invoice surfaces remain usable. Track separately before broad project-page polish claim.

## Production release evidence

- Backup: `/root/backups/cubiqlo/cubicle_pre0066_20260801T215616.dump`; SHA-256 `fcbfdd3d0bb6ea353ebe3de78471e6051f05ca54f4f695f34679150a404c5aab`.
- Disposable restore parity: tables `71/71`, invoices `50/50`, invoice items `111/111`; restore DB removed.
- Migration `0066` applied to production `cubicle`; columns/index verified; duplicate Time Entry sources `0`.
- Production image: `cubiqlo-prod:2efcc9b4365ccf5c1d3602b0a407edae8e3747da-invoice-source-20260801`.
- Recreated only `cubiqlo-new-app`; health reports app/database `ok`; fresh filtered logs contain no errors.
- Live authenticated `/app/invoices/new` renders successfully.
- Production DB reconciliation: Time Entry links `57`, distinct sources `57`, duplicates `0`.
- `dokploy-traefik` remains sole public 80/443 owner; Cubiqlo domains and unrelated 9Router domain route independently.

## Pending canonical-plan work

None for this revision. React hydration `#418` on existing Hourly/Retainer project pages remains a separate follow-up and does not block invoice source workflows.

## Deployment boundary

Production migrated and deployed following shared VPS guardrails. Rollback image: `cubiqlo-prod:sha-107e79b14a3b-portal-delete-20260801065247`.
