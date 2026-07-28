# Phase 0B reconciliation summary — `cubicle_dev`

Generated UTC: 2026-07-27

## Scope

- Database: `cubicle_dev`
- Production database `cubicle`: not queried or modified by reconciliation/restore scripts.
- Canonical raw evidence: `reconciliation-source-20260727T173307Z.tsv`
- Restored comparison: `reconciliation-restored-20260727T173307Z.tsv`
- Rollback comparison: `reconciliation-rollback-20260727T173307Z.tsv`

## Results

- Public tables counted: 53
- Project/package mappings: 24 total; 8 resolved; 16 no assignment; 0 orphan/mismatch.
- Invoice source mappings: 50 total; 36 resolved time entries; 11 manual/snapshot; 3 legacy missing time-entry sources.
- Package classification: 5 total; 2 `legacy_recurring_unmodeled`; 3 `legacy_unclassified`.
- Tracked minutes: 4,133 across all status/billable groups.
- Invoice totals preserved by status and currency for IDR, EUR, GBP, USD, and SGD.
- All structural cross-workspace/orphan checks: zero except documented legacy invoice source links.
- Backup SHA-256: PASS.
- Restored reconciliation byte-for-byte match: PASS.
- Rollback reconciliation byte-for-byte match: PASS.
- Disposable restore/rollback databases removed: PASS.

## Documented legacy exception

Three `invoice_items` rows on paid development fixture invoice `INV-0001` use `source_type='time_entry'` but point to time entries no longer present:

- `aacc9f4e-9e3a-45af-8e82-fe3c9ab2ec95`
- `caf60500-02c8-4edc-a496-aa91cf617a07`
- `ec9220f7-442c-4716-9e62-6a77618c1b72`

Decision: preserve immutable paid invoice snapshots. Do not recreate fake time entries and do not rewrite financial history. Import code and unique source index prevent new duplicate links. Production cutover must run same report and classify any non-zero result before go/no-go.

## Backup/restore evidence

See `backup-restore-rollback-20260727T173307Z.md`.

Backup artifacts remain outside repository:

- `/root/backups/databases/cubiqlo-dev-phase0b/cubicle_dev-phase0b-20260727T173307Z.dump`
- `/root/backups/databases/cubiqlo-dev-phase0b/cubicle_dev-phase0b-20260727T173307Z.dump.sha256`

## Gate

Phase 0B development reconciliation: PASS with documented historical exception. No production migration/deploy approval implied.
