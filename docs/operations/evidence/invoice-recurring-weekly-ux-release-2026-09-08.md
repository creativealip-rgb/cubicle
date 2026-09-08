# Invoice, Recurring Invoice, and Weekly Time UX Release — 2026-09-08

## Scope

- Invoice creation: searchable Client picker, structured form sections, discount, Tax/Admin fee selection, live totals, stale Server Action recovery, and safer production logging.
- Recurring invoices: explicit searchable Client/Project pickers, multiple line items, currency allowlist, discount, Tax/Admin fee rate, due days, schedule validation, compact actions, and stale-action recovery.
- Weekly time: persistent five-row empty grid, grouped Project picker, Task picker, chevrons, and My Hours-aligned desktop column widths.

## Data changes

- Additive migration: `drizzle/0094_recurring_invoice_financials.sql`.
- Added recurring rule fields: `discount`, `charge_type`, `charge_rate`, and `due_days`.
- Existing rules preserved with defaults: zero discount/rate, `none` charge, 14 due days.
- Migration replayed twice successfully.

## Weekly layout contract

- Project: minimum 280px.
- Task: minimum 220px.
- Day: minimum 72px each.
- Total: 80px.
- Desktop table minimum width: 1092px with contained horizontal scrolling where required.

## Verification

- Full suite: 391 test files, 1,780 tests passed after recurring invoice changes.
- Weekly focused suite: 3 tests passed.
- ESLint passed.
- Next.js production builds passed.
- Production browser QA passed on desktop/mobile with no page errors or document-level horizontal overflow.
- Recurring Invoice read-only browser QA preserved DB rule count `2 → 2`.
- Weekly final live DOM measured Project 280px and Task 220px.
- Production health returned app and DB `ok`.

## Release references

- Recurring Invoice release: commit `1c7ff03`, image `cubiqlo-prod:sha-1c7ff03`.
- Weekly width baseline: commit `2b4df36`.
- Final Project width: commit `f3becf3`, image `cubiqlo-prod:sha-f3becf3`.
