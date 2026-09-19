# Calendar availability deduplication — 2026-09-18

## Impact

- Removed duplicate exact availability slots while preserving oldest matching row.
- Prevented exact duplicates per workspace, day, start time, end time, and timezone.
- Replaced production Server Action exception/digest with normal form feedback.

## Root cause

`createAvailabilityRule()` inserted without duplicate validation and `availability_rules` had no exact-slot unique index. After adding the DB guard, expected duplicate rejection was thrown from a Server Action. Next.js production redacted that exception into a digest, shown by React as minified error `#441`.

## Changes

- Migration `drizzle/0105_availability_rule_uniqueness.sql`:
  - keeps oldest exact slot;
  - removes later duplicates;
  - creates `availability_rules_exact_slot_unique`.
- Drizzle schema mirrors the unique index.
- Create action performs a readable pre-check and retains PostgreSQL `23505` handling for races.
- Duplicate rejection returns `{ ok: false, error }` instead of throwing.
- Availability form displays `This availability slot already exists` as toast and keeps dialog open.

## Production data result

Workspace `Alip` now has five exact work-hour slots:

- Monday `09:00–17:00`
- Tuesday `09:00–17:00`
- Wednesday `09:00–17:00`
- Thursday `10:00–18:00`
- Friday `09:00–16:00`

Remaining exact duplicate groups: `0`.

## Verification

- Focused regression: `3/3 PASS`.
- TypeScript: `PASS`.
- Focused ESLint: `PASS`.
- Production build: `PASS`.
- Migration replay: `PASS`.
- Direct duplicate insert probe: rejected by `availability_rules_exact_slot_unique`.
- Production health: app `ok`, DB `ok`.
- Port/proxy collision checks: `PASS`.

## Release

- Constraint/data cleanup commit: `729bb15e0aca0d86effb260103a629676806f143`.
- User-facing domain-feedback commit: `c273e597974a419b712ae4884052b0aa09823c01`.
- Running image: `cubiqlo-prod:sha-c273e597974a419b712ae4884052b0aa09823c01`.
- Pre-migration backup: `/root/backups/cubiqlo/pre-availability-dedupe-*.dump` with SHA-256 sidecar.
