# Billing-Aware Phase 9 Destructive Cleanup — 2026-07-29

## Scope

- Project: Cubiqlo/Cubicle.
- Worktree: `/root/.config/superpowers/worktrees/cubicle/billing-aware-phase1`.
- Branch: `feat/billing-aware-phase1`.
- Source SHA before cleanup: `2053715a75ffa700d964203da215f67d7fbf67a8`.
- Production: untouched.

## Approval

Alip explicitly approved Phase 9 continuation in Telegram with `Lanjutkan` after the prior handoff stated Phase 9 is destructive and requires separate approval.

## Backup

Local code/schema backup created before destructive cleanup edits:

- `backups/phase9/phase9-code-schema-backup-20260729-004421.tar.gz`
- SHA256: `015466257368e4004a381fd71debd191158bb0beaa009a613d38447a476cdd40`
- Size: `35928365` bytes

This backup excludes `.git`, `node_modules`, `.next`, and nested `backups`.

## Reconciliation evidence

Preflight evidence from `docs/audits/BILLING_AWARE_PREFLIGHT_DEV_20260728.md`:

- Open timers: 0.
- Project Activity links: 0.
- Time entries with Activity: 0.
- Project Service snapshots: 0.
- Package orders: 0.
- Custom Package requests: 0.
- Tasks linked to Project Service: 0.
- Time entries linked to Project Service: 0.
- Eight legacy Package projects were classified/cut over in Phase 8 before this cleanup gate.

Reference ledger generated:

- `docs/audits/BILLING_AWARE_REFERENCE_LEDGER.txt`
- Lines: 2349

## Dry-run

Migration file prepared for dry-run:

- `drizzle/0062_billing_aware_phase9_cleanup.sql`

Dry-run rule:

- Apply only to disposable/dev clone first.
- Do not apply to production without separate deploy/DB approval.
- Service schema is untouched by design.

## Cleanup intent

Remove obsolete Package/Activity active write paths and obsolete catalog schema:

- Package write operations now fail closed with `Paket legacy sudah masuk fase cleanup; data historis hanya bisa dibaca`.
- Activity write operations now fail closed with `Aktivitas legacy sudah masuk fase cleanup; data historis hanya bisa dibaca`.
- Migration removes `time_entries.activity_id`, `projects.selected_package_id`, and Package/Activity catalog tables.
- `services` and `project_services` are not dropped.

## Production status

Production: untouched.
