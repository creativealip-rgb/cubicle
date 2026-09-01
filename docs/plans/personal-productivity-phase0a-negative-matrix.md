# Personal Productivity Phase 0A — Authorization & Negative Matrix

All personal actions derive `user_id` from authenticated session. Browser payload never selects owner. Workspace role affects business Expense only.

## Roles/navigation

| Case                      |    Owner |   Member |   Viewer | Guest |
| ------------------------- | -------: | -------: | -------: | ----: |
| Personal group visible    |      yes |      yes |      yes |    no |
| Notes/Journal child       |      yes |       no |       no |    no |
| Productivity child        |      yes |      yes |      yes |    no |
| Personal CRUD             | own only | own only | own only |    no |
| Business Expense read     |      yes |      yes |      yes |    no |
| Business Expense mutation |      yes |      yes |       no |    no |

Navigation implementation contract:

- Replace group-only `ownerOnly` with child-level role visibility.
- Filter children first; hide group only when no child remains.
- Direct URL authorization remains server-side; hidden menu is not authorization.
- Update old test expecting Personal hidden for member/viewer.

## User A/B behavioral matrix

| Surface                | Positive                 | Negative request                   | Required result                       |
| ---------------------- | ------------------------ | ---------------------------------- | ------------------------------------- |
| Goal read              | A reads A                | A requests B goal ID               | not found; no metadata leak           |
| Goal mutation          | A edits A                | A edits/deletes B                  | no row changed                        |
| Goal step create       | A step under A goal      | A supplies B goal                  | rejected app and composite FK         |
| Habit read/mutation    | A owns A                 | A requests B habit                 | not found/no change                   |
| Habit-goal link        | A habit to A goal        | A habit to B goal                  | rejected app and composite FK         |
| Goal delete            | A unlinks A habits       | A targets B goal                   | B goal/habits unchanged               |
| Check-in toggle        | A/A/date                 | A supplies B habit                 | rejected; no row                      |
| Concurrent check-in    | same A habit/date twice  | racing inserts                     | one row maximum                       |
| Category CRUD          | A owns A                 | A targets B category               | not found/no change                   |
| Transaction create     | session A                | payload contains B user ID         | payload ignored/rejected; owner A     |
| Transaction category   | A transaction/A category | A uses B category                  | rejected app and composite FK         |
| Category delete        | A category               | A targets B category               | B category/transactions unchanged     |
| Budget read/write      | A/A period               | A requests B config ID             | not found/no change                   |
| Budget copy            | A source→A target        | source belongs B                   | rejected                              |
| Unified list           | A session                | candidate row B                    | B row absent before merge             |
| Receipt upload         | A transaction            | A targets B transaction            | no signed upload/object write         |
| Receipt download       | A canonical key          | A requests B receipt               | not found; no signed URL              |
| Receipt key            | server-generated         | browser supplies key/external URL  | rejected                              |
| Personal export future | deferred                 | accidental business export path    | personal row absent                   |
| Workspace switch       | A switches workspace     | personal query scoped by workspace | forbidden design; same A data remains |

## Receipt lifecycle negatives

- Reject file above 10 MiB.
- Reject unsupported extension, declared MIME, or magic-byte mismatch.
- Reject object key outside `personal/{session_user}/receipts/{transaction_id}/`.
- Failed object write leaves DB receipt unchanged.
- Failed DB update after object write triggers compensating delete.
- Replace removes old object only after authorized new state persists.
- Failed old-object cleanup leaves new DB pointer intact, records retry, and is found by object reconciliation.
- Delete transaction removes authorized object; retry is idempotent.
- Signed URL TTL exactly 300 seconds maximum.

## Budget/money negatives

- Null/non-positive income rejected DB.
- Any null percentage rejected DB.
- Percentage outside 0–100 or sum not 100 rejected DB.
- Non-first-day month rejected DB.
- `ZZZ` may satisfy DB format but is rejected by application ISO whitelist.
- Mixed currencies never aggregate.
- Business Expense never contributes to personal budget.
- Savings allocation never contributes to spending.
- JS `Number`/`parseFloat` aggregate forbidden; assertions compare decimal strings or DB numeric results.

## Required test mapping

Each matrix row gets one positive and one negative behavioral test. Source-string wiring tests supplement, never replace behavior. DB tests run only on disposable `cubicle_phase0a_it*`; script must fail closed for production DB names.
