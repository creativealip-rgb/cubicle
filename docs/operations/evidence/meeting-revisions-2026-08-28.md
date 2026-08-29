# Cubiqlo August Meeting Revisions — Completion Evidence

**Recorded:** 2026-08-28T16:55:28Z  
**Status:** Complete with known runtime limits

## Completion ledger

| Phase | Status | Evidence |
|---|---|---|
| Region defaults and pricing | PASS | Live ID/non-ID defaults, IDR/USD display, cookie override, semantic document language, Pakasir amount separation. |
| Settings, onboarding, Calendar | PASS | Canonical Settings tabs, persistent 7/7 onboarding, Calendar-only booking slug above Availability Rules. |
| Navigation and labels | PASS | Files under Work, Calendar after Finance, Landing Page under Business, Forms label, canonical AI order. |
| Personal Site slug policy | PARTIAL | Team custom slug/persistence/collision/public routes/restore/cleanup passed live. Free downgrade/upgrade passed tests but destructive production downgrade is blocked. |
| Invoice numbering and preview | PASS | Default/custom number, draft edit, duplicate handling, immutable state, detail preview verified live. |
| Recurring invoices | PASS | Migrations `0080`/`0081`, scheduler, patterned sequence, retry idempotency, UI, DB cleanup verified live. |
| Contract numbering | PASS | Proposed/custom number, duplicate handling, draft edit, signed immutability, cleanup verified live. |
| Localization and release gate | PASS | Landing and Personal Site EN/ID coverage; desktop/mobile overflow zero; 302/302 test files and 1530/1530 tests passed on clean `53cd538`; TypeScript, ESLint 0 errors, and production build passed. Calendar layout `81af150` passed focused gates and live geometry QA. |

## Production state

- Running image: `cubiqlo-prod:sha-81af15065cfc3680a585e3d35d7898fbe0c44f28`.
- Health: `{ "status": "ok", "db": "ok" }`.
- `dokploy-traefik` remains sole public reverse proxy on 80/443.
- Unrelated AI work remains excluded: `src/components/ai/chat-panel.tsx`, `src/lib/ai/markdown.ts`, `src/lib/ai/markdown.test.ts`.

## Known runtime limits

1. **Personal Site downgrade/upgrade — BLOCKED.** Available account has active Team entitlement and is not disposable. No DB/admin bypass used.
2. **Real Pakasir lifecycle — BLOCKED pending explicit paid-transaction approval.** No real QRIS payment completed to prove paid webhook activation, replay, cancel, and expiry end to end.
3. **Dependency findings — separate task.** `npm audit` reports 7 findings (4 moderate, 3 high), mostly transitive/build tooling. No `--force`; broad non-force lockfile churn was not adopted.

Blocked rows need a disposable entitlement fixture or authorized real payment; they are not hidden implementation failures.
