# Personal Productivity Phase 0A — Object Reconciliation Contract

Script executable dibuat bersama migration Phase 0A memakai R2 client existing. Script wajib read-only dan hanya boleh menerima prefix test/dev yang diotorisasi eksplisit.

## Input

- DB rows: `user_id`, `transaction_id`, `receipt_key`, required `receipt_size_bytes`, `receipt_mime`, dan `receipt_checksum`.
- Object listing di prefix `personal/` untuk environment test/dev.

## Output dan exit

- `missing_referenced_objects`
- `orphan_objects`
- `invalid_canonical_keys`
- `metadata_or_size_mismatches` (DB expected MIME/size/checksum versus object metadata/content)

Output JSON menyertakan count dan key tiap kelompok. Exit `0` hanya jika semua kelompok kosong; selain itu non-zero. Script tidak boleh menghapus, menyalin, atau mengubah object.

Canonical key: `personal/{user_id}/receipts/{transaction_id}/{uuid}.{ext}`. Setiap DB reference harus cocok dengan owner dan transaction ID row yang sama.
