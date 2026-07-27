# Phase 0A behavioral database integration evidence

Generated UTC: 2026-07-27

## Isolation

- Source schema/data: `cubicle_dev`
- Test database: `cubicle_phase0a_it`
- Production database `cubicle`: refused by wrapper and test runner.
- Disposable database remaining after test: `0`

## Command

```bash
SOURCE_DB=cubicle_dev ./scripts/test-phase0a-db-integration.sh
```

## Result

```text
database=cubicle_phase0a_it
PASS	same-workspace time context accepted
PASS	cross-workspace client rejected
PASS	cross-workspace project rejected
PASS	cross-project task rejected
PASS	timer ownership selector denies another user
PASS	concurrent timer start leaves one active row
PASS	invoice eligibility accepts approved billable completed entry only
PASS	invoice time source idempotency rejects duplicate import
PASS	invoice import persists one source link and invoiced status
PASS	package order idempotency stores one authoritative snapshot
PASS	10 behavioral DB checks
PASS	disposable DB cleanup scheduled
```

Cleanup verification:

```text
SELECT count(*) FROM pg_database WHERE datname='cubicle_phase0a_it';
0
```

Gate: PASS.
