# Cubiqlo Database Schema & Migration Baseline — Juli 2026

**Captured:** 25 Juli 2026 UTC  
**Scope:** read-only production audit + disposable clone verification  
**Production mutation:** none

## Executive result

Production schema bekerja, tetapi riwayat penerapannya tidak dapat dibuktikan secara authoritative dari database.

- PostgreSQL: 16.
- Database: `cubicle`, sekitar 15 MB.
- Public tables: 51.
- Public columns: 607.
- Public indexes: 194.
- Public constraints: 236.
- SQL migration files sebelum cleanup candidate: 40.
- SQL migration files setelah candidate `0040`: 41.
- Drizzle journal entries: 5.
- Production migration ledger tables: 0.
- Duplicate migration prefix: `0005`.
- Missing numeric prefix: `0018`.
- Semantically duplicate foreign-key groups: 35.

## Root cause

Deployment history memakai SQL manual dan script `migrate.sh` yang:

1. Menjalankan seluruh file berurutan tanpa authoritative applied ledger.
2. Menganggap error yang mengandung `already exists` sebagai kondisi sukses umum.
3. Tidak menjalankan seluruh migration sebagai transaksi atomic.
4. Memiliki journal repo yang berhenti pada lima tag awal.

Karena database tidak menyimpan migration ID, checksum, atau timestamp penerapan, status historis tidak boleh direkonstruksi sebagai fakta hanya dari keberadaan object akhir. Git history dan schema live hanya memberi inference.

## Repository migration findings

### Journaled tags

- `0000_fantastic_red_wolf`
- `0001_simple_karma`
- `0003_finance`
- `0004_proposals_recurring`
- `0005_brief_zzzax`

Journal index `2` tidak ada. File `0002_ai_search_indexes.sql` ada tetapi tidak terdaftar.

### Numbering conflicts

Dua file memakai prefix sama:

- `0005_brief_zzzax.sql`
- `0005_questionnaires.sql`

Prefix `0018` tidak ada.

File historis tidak boleh di-rename atau diedit karena mungkin pernah dijalankan manual. Konflik dicatat dalam baseline; migration baru harus memakai nomor unik berikutnya.

### Idempotency risks

Dua belas migration mengandung `CREATE`, `ADD COLUMN`, `ADD CONSTRAINT`, atau `DROP` tanpa guard yang cukup:

- `0000_fantastic_red_wolf.sql`
- `0001_simple_karma.sql`
- `0003_finance.sql`
- `0004_proposals_recurring.sql`
- `0005_brief_zzzax.sql`
- `0005_questionnaires.sql`
- `0006_contracts.sql`
- `0007_workspace_billing_extras.sql`
- `0009_workspace_reply_to_email.sql`
- `0025_package_orders.sql`
- `0026_project_selected_package.sql`
- `0039_personal_note_task_fk.sql`

Menjalankan ulang semua migration lama bukan prosedur baseline yang aman.

## Foreign-key duplicate finding

Query mengelompokkan FK berdasarkan:

- source table;
- source column attnums;
- referenced table;
- referenced column attnums;
- update action;
- delete action;
- match type.

Hasil:

- 35 grup duplicate.
- Setiap grup berisi tepat dua constraint.
- Semua pasangan punya action identik.
- Semua constraint validated.
- Tidak ada pasangan deferrable.
- Pola konsisten: constraint `*_fkey` menduplikasi constraint Drizzle `*_..._fk`.

Cleanup candidate mempertahankan constraint bernama Drizzle dan menghapus pasangan manual `*_fkey`.

## Disposable clone proof

Database sementara: `cubicle_fk_audit_20260725`.

Prosedur:

1. Create empty disposable DB.
2. Import production schema-only dump.
3. Count FK dan duplicate groups.
4. Apply `drizzle/0040_cleanup_duplicate_foreign_keys.sql` dengan `ON_ERROR_STOP=1`.
5. Verify zero duplicate groups dan seluruh FK tersisa validated.
6. Drop disposable DB.

Result:

- Duplicate groups: `35 → 0`.
- Total foreign keys: `161 → 126`.
- Invalid foreign keys after cleanup: `0`.
- Clone removed after verification: yes.
- Production DB changed: no.

## Cleanup migration safety

`0040_cleanup_duplicate_foreign_keys.sql`:

- memakai satu transaction;
- memakai `lock_timeout = '5s'`;
- memakai `statement_timeout = '60s'`;
- memakai exact constraint names;
- memakai `DROP CONSTRAINT IF EXISTS`;
- mempertahankan satu FK semantik per relasi;
- memiliki postcondition yang abort jika duplicate FK masih tersisa.

## Rollback strategy

Jangan mengandalkan rollback dengan menambahkan ulang constraint pada traffic aktif. Rollback utama:

1. Ambil logical backup + SHA256 sebelum production migration.
2. Simpan schema-only dump pre-change.
3. Jalankan cleanup dalam maintenance window.
4. Jika migration gagal sebelum `COMMIT`, PostgreSQL transaction otomatis mengembalikan semua drop.
5. Jika issue ditemukan setelah commit, restore schema/database dari backup ke clone dulu, validasi, lalu pilih:
   - re-add exact dropped constraints dengan `NOT VALID`, kemudian `VALIDATE CONSTRAINT`; atau
   - restore penuh bila ada kerusakan di luar constraint metadata.

Karena satu FK identik tetap dipertahankan, expected rollback untuk behavior aplikasi tidak diperlukan. Backup tetap wajib untuk operational proof.

## Authoritative ledger recommendation

Jangan menandai 40 migration historis sebagai applied satu per satu tanpa bukti.

Gunakan baseline event tunggal:

1. Create dedicated ledger table.
2. Insert baseline record yang menunjuk:
   - schema dump SHA256;
   - migration manifest SHA256;
   - git commit;
   - timestamp;
   - operator.
3. Hanya migration setelah baseline yang masuk sebagai record individual dengan checksum.
4. Runner wajib:
   - acquire advisory lock;
   - reject duplicate ID/checksum drift;
   - execute transactionally;
   - stop on first error;
   - never parse `already exists` as generic success.

## Evidence

- `docs/operations/evidence/production-schema-2026-07-25.sql`
- `docs/operations/evidence/production-objects-2026-07-25.csv`
- `docs/operations/evidence/production-indexes-2026-07-25.csv`
- `docs/operations/evidence/production-constraints-2026-07-25.csv`
- `docs/operations/evidence/migration-manifest-2026-07-25.csv`
- `docs/operations/evidence/SHA256SUMS`

Evidence berisi schema metadata, bukan row data atau secret.

## Current decision

- Inventory/schema freeze: completed.
- Duplicate FK mapping: completed.
- Cleanup clone proof: completed.
- Production duplicate FK cleanup: completed 25 Juli 2026.
- Authoritative production ledger: created as `public.cubiqlo_migrations`.
- Production result: duplicate groups `35 → 0`, foreign keys `161 → 126`, invalid foreign keys `0`.
- FK leading-index audit completed 25 Juli 2026: uncovered FK `7 → 0`, invalid/unready index `0` melalui `0042_add_fk_indexes.sql`.
- Disposable restore proof mempertahankan exact row-count map hash; production runner rerun menjadi controlled no-op.
- Runner second execution: controlled no-op.
- Pre-change backup: `/root/backups/databases/cubiqlo-manual/cubicle-pre-fk-cleanup-20260725T124656Z.dump` with SHA256 sidecar.
- Restore proof: 51 tables, 1,992 exact rows, and identical per-table row-map SHA256.
- Next safe step: separate least-privilege production DB roles.
