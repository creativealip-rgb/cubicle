# R2 End-to-End Capacity — 2026-09-14

## Verdict

`SAFE TESTED LEVEL` for one 5 MiB workspace-file lifecycle at a time. The product limit is 25 MiB; 50 MiB is correctly rejected before transfer and is not a supported workload.

## Environment

Isolated HTTPS app, PostgreSQL clone, and Redis using the production R2 provider credentials. Synthetic workspace/file names used the exact `R2-CAP-*` namespace. Production DB and user file rows were untouched.

## Valid runs

Both runs exercised auth, quota reservation, quarantine upload, server checksum/magic validation, immutable promotion, completed DB state, signed R2 download, byte/SHA-256 parity, UI delete, and cleanup.

- Run 1: upload 5,242,880 bytes in 2,402.2 ms; download in 704.2 ms; 5,242,880 bytes; SHA-256 parity PASS; 50 MiB rejected HTTP 413 in 136.3 ms.
- Run 2: upload in 2,604.9 ms; download in 754.5 ms; byte/SHA-256 parity PASS; 50 MiB rejected HTTP 413 in 125.8 ms.
- Fixed-image proof: upload in 3,185.6 ms; download in 1,317.8 ms; parity PASS; 50 MiB rejected HTTP 413 in 109.3 ms.

SHA-256 for deterministic 5 MiB payload: `e96357d1970b563bd1050ffad717b077d971df4603eed594d60c7a0f726e5e9c`.

## Bug found and fixed

UI deletion removed the R2 object and `files` row but left a completed `upload_intents` row whose `final_file_id` became null. `deleteFile` now deletes matching workspace-scoped upload intents and the file row in one DB transaction after object deletion. Regression test: `src/lib/file-delete-upload-ledger.test.ts`.

Fresh fixed image `sha256:3faa0ee22097ee1169ca816e513dc672bb194034b0307b09363cfe17989cc837` passed the lifecycle. Exact post-run namespace counts: files 0, intents 0, reservations 0. R2 inventory showed no orphan and no metadata mismatch. Global clone reconciliation still contains six older missing references copied from the baseline production snapshot; they predate and are outside this test namespace, so they are not attributed to this run.

Synthetic users/workspace and all exact test artifacts were deleted. Private evidence: `/root/backups/cubiqlo/r2-capacity-20260914/`; manifest SHA-256 `34c071893fdf4c341fb21e584725d32122a77451a7a5d3f308a1adef26979754`. No credentials or session cookies are retained.

## Limit

Concurrent R2 throughput, 25 MiB boundary transfer, portal upload paths, and long R2 soak remain `NOT ESTABLISHED`. A 50 MiB transfer requires an explicit product-limit change first.
