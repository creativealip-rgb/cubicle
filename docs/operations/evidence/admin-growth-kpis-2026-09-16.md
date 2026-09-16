# Admin Growth KPI Evidence — 2026-09-16

## Scope
Phase 1 read-only DB-derived dashboard. No schema migration.

## Automated evidence
- `npx vitest run src/lib/admin-growth-metrics.test.ts` — PASS, 8 tests.
- `npx vitest run src/lib/actions/admin/dashboard.test.ts` — expected source-wiring test added; runtime production DB check BLOCKED until configured DB environment is available.

## Metric rules
- Activated workspace: client + project + task/invoice/time entry/portal visit.
- Ranges: 7d, 30d, 90d, 12m.
- MRR: completed plan payments; annual payments divided by 12.
- ARR: MRR × 12.
- Visitors, referrals, CAC: `Not tracked yet`; Phase 2 required.

## Known verification limits
- TypeScript/build currently blocked by existing dependency/type-resolution errors in installed `drizzle-orm`, Vitest, and unresolved project alias setup in direct `tsc` invocation.
- Production aggregate script requires configured database environment; no deployment performed.
