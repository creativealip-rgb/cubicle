# Cubiqlo Hardening Audit — Progress

**Date:** 2026-10-14
**Scope:** execution of `.hermes/plans/2026-10-14_152525-cubiqlo-codebase-hardening-and-feature-verification.md`

## Baseline

- Branch: `main`
- Starting commit: `88993766`
- Working tree contained no tracked modifications before this execution.
- Initial source inventory: 101 app pages, 79 API route files, 69 action files, 102 DB tables.
- Initial quality: TypeScript pass, 516 Vitest files / 2,321 tests pass, production build pass, ESLint 0 errors / 115 warnings, production audit 0 vulnerabilities.

## Completed in this execution

### Phase 0 — partial artifacts completed

- Added generated inventory script: `scripts/audit-feature-inventory.mjs`.
- Generated: `docs/audits/cubiqlo-feature-matrix.md`.
- Recorded this audit file.

### Phase 2 — distributed rate-limit retirement completed at source level

- Removed unused legacy in-memory implementation: `src/lib/rate-limit.ts`.
- Migrated its identity tests to `src/lib/rate-limit.test.ts`, now testing distributed helper identity behavior.
- Confirmed real consumers use `src/lib/distributed-rate-limit.ts`.
- Focused rate-limit tests: 3 files, 25 tests pass.
- TypeScript pass.
- Grep confirms no production import of legacy limiter.
- Updated architecture doc to point at Redis-backed limiter.

### Phase 4 — migration registry checker added

- Added `scripts/check-migration-integrity.sh`.
- Added `npm run db:check-migrations`.
- Registered strict migration files `0097` through `0117` in `docs/migration-registry.md`.
- Checker pass: 21 strict SQL files registered; historical files before `0097` intentionally excluded per `scripts/migrate-ledger.sh` baseline policy.
- No database migration was applied.

### Phase 7 — documentation partially updated

- README feature list now includes builders, personal site, productivity, add-ons, and admin control plane.
- No production or development deployment performed.

## Fresh verification

- `npm run db:check-migrations`: PASS.
- Focused distributed rate-limit tests: PASS — 25 tests.
- `npx tsc --noEmit --pretty false`: PASS.
- `npm test`: PASS — 516 files, 2,318 tests.
- `npm run build`: PASS.
- `npm audit --omit=dev --audit-level=high`: PASS — 0 vulnerabilities.
- `git diff --check`: PASS.
- Fresh post-cleanup gate: `npm test` PASS — 516 files, 2,318 tests; `npm run build` PASS.
- `npx tsc --noEmit --pretty false`: PASS after cleanup.
- ESLint: 53 warnings, 0 errors after removing the invoice template effect warning; remaining warnings are semantic unused props/locals, hook dependencies, navigation, and image rules. E2E auth setup succeeds with supplied credential, but smoke suite result is **6 passed / 7 failed** against current production artifact. Failures: valid login and authenticated page flows time out waiting for `/app/**`; rate-limit header contract expects `x-ratelimit-limit`/`x-ratelimit-remaining`, but headers are absent. Public routes, login page, signup page, health API, and invalid-login checks pass.
- Local fix added in `src/app/api/auth/[...all]/route.ts`: GET auth responses now receive distributed rate-limit headers. This is uncommitted and not deployed, so production rate-limit E2E remains open.
- After E2E spec fix to use `E2E_EMAIL`/`E2E_PASSWORD`, authenticated tests reuse `.auth/user.json` instead of repeated login. Dev container rebuilt with `local-e2e-fix`, health returned `{"status":"ok","db":"ok"}`, and `https://dev.cubiqlo.com` smoke suite passed **13/13** including auth, dashboard, clients, invoices, Brain, settings, and rate-limit headers. Production remains unmodified; its prior retry was blocked by HTTP `429`.
- Cross-tenant browser suite was attempted against dev but all 4 tests were blocked by the same auth rate limit (`{"error":"Too many requests"}`) before assertions. No cross-tenant pass is claimed; use a fresh QA account or isolated Redis key/window.

## Phase 3 — partial verification completed

- Existing tenancy/resource hardening suite: 8 test files, 35 tests pass.
- Evidence covers workspace/resource scoping, personal `userId` scoping, public/export admission, portal password, invoice hardening, and upload-ledger boundaries.
- Production/action grep found 439 workspace-scoped predicates under `src/lib/actions`.
- Live browser cross-tenant verification remains pending and was not faked.

## Open work — not claimed complete

- ESLint: 54 warnings remain, 0 errors after safe cleanup; semantic warning work remains. Zero-warning gate is **not complete**.
- Phase 3 full authorization/tenancy matrix and cross-tenant browser verification: pending.
- Phase 5 complete feature-by-feature browser/DB verification: pending.
- Phase 6 hotspot refactors: intentionally not started; no behavior tests were added yet.
- Phase 7 full README/canonical-doc reconciliation: pending.
- Phase 8 full Playwright suite and fixture cleanup: pending.
- Phase 9 final report and dev integration deployment: pending.
- Production deployment: not performed.

## Integrity note

Current uncommitted changes are limited to audit artifacts, docs, package script, migration checker, and legacy rate-limiter retirement/test migration. No production data or deployment infrastructure was changed.

## Next execution slice

1. Fix ESLint warnings in small domain batches, starting with unused values and internal navigation.
2. Run focused tests per batch.
3. Add authorization matrix and run existing cross-tenant suite on isolated dev.
4. Continue only after fresh `git status` and diff review.
