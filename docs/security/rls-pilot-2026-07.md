# RLS Pilot Decision — 2026-07-25

## Decision

**HOLD production rollout.** PostgreSQL RLS correctly enforces workspace row boundaries on a disposable production clone, but current request/database architecture does not establish transaction-local tenant context. Enabling it now would break authenticated, public-token, and background flows.

Production schema was not changed.

## Pilot scope

- Disposable database: `cubicle_rls_pilot`
- Source: fresh custom-format dump of production database
- Tables: `files`, `invoices`
- Runtime role: `cubiqlo_app`
- Context prototype: transaction-local `app.workspace_id`
- Public/background prototype: transaction-local `app.public_access`

Clone baseline:

- 52 public tables
- 17 workspaces
- 6 files
- 41 invoices across 8 invoice workspaces

## Observed behavior

### Before RLS

`cubiqlo_app` could read all 6 files and all 41 invoices. Application predicates were the only tenant boundary.

### After fail-closed policies

- No context: files `0`, invoices `0`.
- Workspace A context: invoices `15`, distinct workspace count `1`.
- Workspace B context: invoices `1`, distinct workspace count `1`.
- Context after transaction commit: invoices `0`; `SET LOCAL` did not leak through pooled sessions.
- Foreign-workspace update: affected `0` rows.
- Own-workspace update: affected `1` row.
- Foreign-workspace insert: rejected with `new row violates row-level security policy`.

### Public/background bypass prototype

`app.public_access=on` exposed all 6 files and all 41 invoices and allowed a cross-workspace update. A generic boolean bypass has unacceptable blast radius and must not become application-facing authorization.

## Compatibility findings

1. `src/db/index.ts` exports one global `pg.Pool`-backed Drizzle client with no request context hook.
2. Most server actions issue standalone queries before entering any transaction. They would see zero rows under fail-closed RLS.
3. `src/app/api/files/[fileId]/download/route.ts` reads `files` before resolving session or portal token. It cannot establish workspace context first.
4. `src/app/api/invoices/share/[token]/pdf/route.ts` resolves a share-token hash directly from `invoices`. It cannot know workspace context before reading the protected row.
5. `src/app/api/cron/invoice-overdue/route.ts` intentionally performs a cross-workspace background operation.
6. Viewer/member/owner authorization remains application logic. A workspace-only policy does not replace mutation role checks.

## Preconditions before another pilot

1. Add a transaction-scoped DB API such as `withWorkspaceDb(workspaceId, callback)` that starts a transaction and executes `set_config('app.workspace_id', workspaceId, true)` before protected queries.
2. Migrate protected-table request paths so every query, including authorization lookup, runs through that scoped transaction.
3. Split public credential resolution from tenant data. Options:
   - unprotected capability table containing token hash, target resource, workspace, expiry, and revocation; then enter scoped transaction, or
   - narrowly scoped `SECURITY DEFINER` resolver with fixed `search_path`, least privileges, and tests.
4. Use a dedicated background role or narrowly scoped definer functions for legitimate cross-workspace jobs. Never expose a generic bypass flag to request code.
5. Add connection-pool leakage tests, transaction rollback tests, public-token lifecycle tests, and background-job tests.
6. Repeat pilot on clone before any production migration.

## Recommendation

Keep application-level tenant predicates plus the automated cross-tenant suite as launch protection. Revisit RLS after transaction-scoped DB access and capability/background separation exist. RLS remains defense in depth, not a launch blocker.
