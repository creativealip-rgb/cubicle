# Personal Productivity Phase 0A — Test & Review Contract

## Files expected before execution approval

- Canonical plan.
- Schema/migration contract.
- Reconciliation SQL.
- Authorization negative matrix.
- Reserved additive migration SQL and matching `src/db/schema.ts` diff.
- Disposable-DB integration test extension or isolated personal Phase 0A runner.

## Mechanical gates

1. Re-check latest migration number (`0083` is next at this review) and reserve one slot; fail if filename collides.
2. `git diff --check` and Markdown formatting pass.
3. Migration applies once to fresh DB and cloned dev DB.
4. Retry behavior is either safe or runner ledger prevents replay with checksum proof.
5. ORM and DB expose every named constraint/index from schema ledger.
6. Reconciliation uses an expected-object `VALUES` ledger and returns zero missing/unexpected objects; report-only catalog queries do not pass this gate.
   The executable runner must capture every result and exit non-zero when any `violations` value is non-zero or any missing/unexpected-object query returns rows. Plain `psql` execution is report-only and never counts as a green gate.
7. No existing `expenses`, `expense_categories`, or `expense_recurring` semantics change.
8. Typecheck, targeted tests, full tests, and build pass independently.

## Disposable DB cases

### Migration

- Existing users receive non-null timezone using documented priority.
- Timezone backfill deterministically chooses earliest owned workspace; users without owned workspace receive fallback. Assert aggregate counts by source.
- Fresh user default is `Asia/Jakarta`.
- Seven tables, helper function, all constraints, and indexes exist.
- FK column types match `users.id text` and UUID parent IDs.

### DB invariants

- Cross-user step, habit-goal, check-in, and transaction-category links fail with FK violation.
- Invalid priority/status/progress, habit schedule, type/bucket, amount, currency format, month, percentage, and total fail with check violation.
- Duplicate check-in, case-insensitive category, and budget period fail with unique violation.
- Goal/category delete transaction preserves child history by unlinking same-user nullable references.
- Racing check-in inserts leave one row.
- Racing budget copy leaves one canonical period config.

### Action behavior

- Every read/update/delete selects by resource ID plus session user ID.
- Supplied `user_id` is absent from accepted input schema or ignored before persistence.
- Viewer can mutate own personal data and cannot mutate business Expense.
- Business owner/member behavior remains unchanged.
- Currency is checked against ISO 4217 whitelist at action boundary.
- Decimal budget aggregation stays in PostgreSQL numeric path.

### Cursor behavior

Canonical ordering: `date DESC, created_at DESC, source_rank DESC, id DESC` where personal=1, business=0.

Test equal dates/timestamps, UUID collision across sources, exact page boundary, fewer than page size, and insert between requests. Assert every pre-existing row appears exactly once. Cursor is exclusive and contains `{date,createdAt,sourceRank,id}`.

### Navigation

- Owner sees Notes, Journal, Productivity.
- Member/viewer see Productivity only inside Personal group.
- Guest is redirected.
- Direct Notes/Journal authorization stays owner-only.
- Active route and mobile/flyout rendering still work after child filtering.

### Receipt lifecycle

Run every negative in `personal-productivity-phase0a-negative-matrix.md`; assert DB row and object state after failures.

Implement lalu jalankan script object reconciliation read-only terhadap test prefix. Script harus memakai R2 client existing dan melaporkan missing referenced objects, orphan objects, invalid canonical keys, serta metadata/size mismatch secara terpisah. Kontrak output ada di `personal-productivity-phase0a-object-reconciliation.md`; dokumen kontrak tidak dihitung sebagai bukti eksekusi.

## Approval rule

Phase 0A becomes implementation-ready only when migration SQL, Drizzle schema, reconciliation output, and behavioral test output are attached to review. Documentation completeness alone does not pass gate.
