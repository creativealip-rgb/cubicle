# Cubiqlo Migration Registry

Reserve a number here before creating SQL. Recheck remote refs and every worktree before integration.

## Allocations

- `0046` — Phase 0A integrity containment.
- `0047` — Project tracking mode Phase 1.
- `0048` — Activity Catalog Phase 2.
- `0049` — Service Catalog Phase 3.
- `0050` — Package Builder Phase 4 — integrated; applied to `cubicle_dev`.
- `0051` — Timesheet approval lifecycle — `feat/mh1-weekly-track` — integrated; applied to `cubicle_dev`.
- `0052` — Timer integrity and segments — `feat/mh1-weekly-track` — integrated; applied to `cubicle_dev`.
- `0053` — Time-entry submission/review lifecycle — `feat/mh1-weekly-track` — integrated; applied to `cubicle_dev`.
- `0054` — Service profitability and client rate cards — `feat/mh1-weekly-track` — integrated; applied to `cubicle_dev`.
- `0055` — Personal Landing Page V2 — integrated; applied to `cubicle_dev`.
- `0056` — Billing-model compatibility + Phase 0A containment — Coder — `feat/billing-aware-phase0` — committed; applied to `cubicle_dev`.
- `0057` — Retainer configuration + workspace timezone — Coder — `feat/billing-aware-phase1` — committed.
- `0058` — Retainer period ledger + time-entry linkage — Coder — `feat/billing-aware-phase1` — committed.
- `0059` — Retainer invoice source integrity — Coder — `feat/billing-aware-phase1` — committed.
- `0060` — Task behavior + archive metadata — Coder — `feat/billing-aware-phase1` — committed.
- `0061` — Legacy billing classification table — Coder — `feat/billing-aware-phase1` — committed.
- `0062` — Billing-aware Phase 9 destructive cleanup — retired; unauthorized to apply; production untouched.
- `0063` — Encrypted invoice share token — reconciled existing migration on `main` — committed.
- `0064` — Billing-aware project tasks and templates — Coder — `main` — committed.
- `0065` — Encrypted Portal password display — Coder — `feat/client-project-invoice-task-revision` — reserved.

## Reservation protocol

1. Fetch all remote refs.
2. Inspect every active worktree, including untracked `drizzle/*.sql`.
3. Record number, owner, feature/phase, branch, and status here.
4. Announce reservation in shared `ACTIVE_BOARD.md`.
5. Recheck registry and worktrees when merging into `dev/integration`.
6. Apply through `scripts/migrate-ledger.sh` with explicit `DB_NAME`; production keeps its separate approval guard.

Status vocabulary: `reserved`, `committed`, `integrated`, `applied-dev`, `applied-production`.

> **0062 retired:** `0062_billing_aware_phase9_cleanup.sql` must not run. Current runtime and
> `src/db/schema.ts` still depend on Package/Activity tables and columns. The migration runner
> skips it explicitly until a future code-first removal ships with behavioral compatibility gates.