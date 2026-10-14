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
- `0065` — Encrypted Portal password display — Coder — `feat/client-project-invoice-task-revision` — committed.
- `0066` — Invoice entry source modes and metadata — Coder — `main` — committed; disposable `cubicle_dev` clone apply/replay verified; production not applied.
- `0070` — Storage add-ons and workspace upload reservations — Coder — `main` (uncommitted) — applied to `cubicle_dev`; production not applied.
- `0071` — Monthly/yearly billing period — Coder — `main` (uncommitted) — applied to `cubicle_dev`; production not applied.
- `0072` — Extra workspace add-on entitlements — Coder — `main` (uncommitted) — reserved; not applied anywhere yet; production not applied.
- `0073` — Storage add-on payment metadata — Coder — `main` (uncommitted) — reserved; not applied anywhere yet; production not applied.
- `0076` — Unified template content blocks (contract/proposal template `content_blocks`) — Coder — `fix/landing-id-headline-underline` — reserved; not applied anywhere yet; production not applied.
- `0077` — Disable unfunded add-on auto-renewal (Phase 3 corrective) — Coder — `main` — committed; not applied anywhere yet; production not applied.
- `0082` — Production hardening task status constraint — Coder — `fix/production-hardening-2026-08-29` — committed; applied-production 2026-08-29.
- `0097` — Upload intent foundation — existing main history; verify through custom migration ledger.
- `0098` — File upload lifecycle — existing main history; verify through custom migration ledger.
- `0099` — Upload lifecycle recovery — existing main history; verify through custom migration ledger.
- `0100` — Upload intent canonical metadata — existing main history; verify through custom migration ledger.
- `0101` — AI usage per user — existing main history; verify through custom migration ledger.
- `0102` — Analytics attribution entitlement and marketing spend — existing main history; verify through custom migration ledger.
- `0103` — Analytics usage events — existing main history; verify through custom migration ledger.
- `0104` — Admin audit integrity — existing main history; verify through custom migration ledger.
- `0105` — Availability rule uniqueness — existing main history; verify through custom migration ledger.
- `0106` — Task subtask description — existing main history; verify through custom migration ledger.
- `0107` — Task comments — existing main history; verify through custom migration ledger.
- `0108` — Task comment attachments — existing main history; verify through custom migration ledger.
- `0109` — Task subtask status — existing main history; verify through custom migration ledger.
- `0110` — Subtask comments — existing main history; verify through custom migration ledger.
- `0111` — User recovery PIN — existing main history; verify through custom migration ledger.
- `0112` — Workspace service info — existing main history; verify through custom migration ledger.
- `0113` — Document slugs — existing main history; verify through custom migration ledger.
- `0114` — Support ticket category — existing main history; verify through custom migration ledger.
- `0115` — Support ticket screenshot — existing main history; verify through custom migration ledger.
- `0116` — Onboarding profile fields — existing main history; verify through custom migration ledger.
- `0117` — Extra member add-ons — existing main history; verify through custom migration ledger.

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