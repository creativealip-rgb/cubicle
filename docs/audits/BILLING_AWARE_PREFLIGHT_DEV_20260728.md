# Billing-Aware Preflight — Dev — 2026-07-28

## Scope

- Source branch: `feat/billing-aware-phase0`
- Source baseline: `e2d636196fd705e062d70064439c2bd4783dd14a`
- Database: `cubicle_dev`
- Production: untouched
- Migration: `0056_billing_model_compatibility.sql`

## Migration evidence

- Migration ledger entry present.
- `projects.billing_model` exists and remains nullable for compatibility.
- `projects_billing_model_check` exists.
- Backfill result: 24 projects, 0 null canonical models.
- Invalid legacy/canonical mappings: 0.

## Project counts

- Hourly: 7 (`hours → hourly`)
- Legacy Package: 8 (`package → legacy_package`)
- Fixed Price: 9 (`project → fixed_price`)

## Package classification evidence

Eight Package projects remain blocked as `legacy_package` pending explicit classification:

- `Design Support Tim Marketing`: 40-hour package; 0 time entries; 0 invoices.
- `Growth Design Sprint 60h Karya Merah`: 60-hour package; 0 time entries; 2 invoices.
- `Konten Kelas dan Campaign`: 40-hour package; 0 time entries; 0 invoices.
- `Konten Retail Bulanan`: 40-hour package; 0 time entries; 0 invoices.
- `Maintenance Digital Klinik`: 40-hour package; 0 time entries; 0 invoices.
- `Print Ops Support Block Andi`: custom hourly block; 1 time entry; 3 invoices.
- `Retainer 40 Jam Surya Digital`: 40-hour package; 32 time entries; 1 invoice.
- `Social Media Property Retainer`: 40-hour package; 0 time entries; 0 invoices.

All current package lifecycle metadata says `one_off`; names alone are not trusted. No automatic Package-to-Retainer conversion is safe.

## Fixed Price historical time

Historical time exists and must remain immutable/internal:

- `Brand Kit Refresh Karya Merah`: 1 approved entry, 120 minutes.
- `Website Company Profile Surya Digital`: 6 approved entries totaling 515 minutes.
- `Website Company Profile Surya Digital`: 2 draft entries totaling 75 minutes.

No listed Fixed Price entry is linked to an invoice.

## Runtime state

- Open timers: 0.
- Project Activity links: 0.
- Time entries with Activity: 0.
- Project Service snapshots: 0.
- Package orders: 0.
- Custom Package requests: 0.
- Proposals with JSON line-item snapshots: 3.
- Tasks linked to Project Service: 0.
- Time entries linked to Project Service: 0.

## Gate decision

- Phase 0A containment can proceed.
- Phase 0B profiling complete.
- Destructive migration remains blocked.
- Eight legacy Package projects require classification in later gated phase.
- Fixed Price historical entries must not be edited, deleted, approved anew, resumed, or invoiced.
