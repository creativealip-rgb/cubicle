# Cubiqlo Migration Registry

Reserve a number here before creating SQL. Recheck remote refs and every worktree before integration.

## Allocations

- `0046` — Phase 0A integrity containment.
- `0047` — Project tracking mode Phase 1.
- `0048` — Activity Catalog Phase 2.
- `0049` — Service Catalog Phase 3.
- `0050` — Package Builder Phase 4 — integrated; applied to `cubicle_dev`.
- `0051` — Timesheet approval lifecycle — `feat/mh1-weekly-track` — integrated pending dev apply.
- `0052` — Timer integrity and segments — `feat/mh1-weekly-track` — integrated pending dev apply.
- `0053` — Time-entry submission/review lifecycle — `feat/mh1-weekly-track` — integrated pending dev apply.
- `0054` — Service profitability and client rate cards — `feat/mh1-weekly-track` — integrated pending dev apply.
- `0055` — Personal Landing Page V2 — integrated; applied to `cubicle_dev`.
- `0056+` — unreserved.

## Reservation protocol

1. Fetch all remote refs.
2. Inspect every active worktree, including untracked `drizzle/*.sql`.
3. Record number, owner, feature/phase, branch, and status here.
4. Announce reservation in shared `ACTIVE_BOARD.md`.
5. Recheck registry and worktrees when merging into `dev/integration`.
6. Apply through `scripts/migrate-ledger.sh` with explicit `DB_NAME`; production keeps its separate approval guard.

Status vocabulary: `reserved`, `committed`, `integrated`, `applied-dev`, `applied-production`.