# Phase 6 Capacity Benchmark Evidence — 2026-09-14

## Environment

Isolated app, PostgreSQL clone, and Redis. Public production target, production DB, production Redis, and production R2 were excluded. k6 image pinned to `grafana/k6@sha256:1f40432b1cbe7234e977f96c362c9bc550a2d2b583d014dd8669fe40d3e9e755` (k6 v0.54.0).

## Valid runs

| Workload | VU | Duration | Requests | Error | p95 | Result |
|---|---:|---:|---:|---:|---:|---|
| Baseline normal read | 5 | short validation | 119 | 0% | 114 ms | PASS |
| Expected normal mixed read | 50 | 30m | 17,816 | 0% | 113 ms | PASS |
| Stress normal mixed read | 100 | 30m | 35,285 | 0% | 253 ms | PASS |
| Normal mixed read soak | 50 | 2h | 71,079 | 0% | 161 ms | PASS |
| DB-heavy + XLSX run 1 | 10 | 5m | 1,596 | 0% | 171 ms | PASS |
| DB-heavy + XLSX run 2 | 10 | 5m | 1,589 | 0% | 223 ms | PASS |

Heavy run per-class p95:

| Run | DB-heavy | XLSX |
|---|---:|---:|
| 1 | 170 ms | 191 ms |
| 2 | 205 ms | 230 ms |

Run-2 p95 variance versus run 1: overall +30.62%, DB-heavy +20.91%, XLSX +20.48%. Both runs stayed far below declared 4s report and 10s XLSX thresholds, with 100% checks and zero unexpected HTTP failures.

## Soak and recovery

- 50 VU, 2h, 71,079 requests, zero errors, p95 161 ms.
- Recovery observation: 19m53s, 159 samples, zero health failures.
- Recovery average/max health latency: 3.77/13 ms.
- Post-soak RAM returned to approximately 123 MiB.
- Post-run invariants: zero cross-tenant leak, orphan file, stale upload reservation, export lease, and migration drift.

## Upload validator capacity

| Logical workload | Parallel | Elapsed | Heap delta | Result |
|---|---:|---:|---:|---|
| 5 MiB streamed PDF | 4 | 41 ms | 1.12 MiB | PASS |
| 50 MiB streamed PDF | 4 | 325 ms | 716 KiB | PASS |
| 50 MiB streamed PDF | 20 | prior Phase 4 run | below 256 MiB ceiling | PASS |

This proves application streaming/hash/MIME validation only. R2/provider network throughput is NOT ESTABLISHED.

## Export contention

- Five workspace export acquisitions: two admitted, three rejected; slot reuse PASS.
- Five same-user real Report XLSX requests: one HTTP 200 (12,632 bytes, 529 ms), four HTTP 429 by policy.
- 100 concurrent authenticated dashboard requests during held export slots: zero failures, 4.124s batch duration.
- Redis unavailable: HTTP 503 fail-closed.

## AI

- Direct HTTP against deterministic local OpenAI-compatible mock: 10/10 HTTP 200, `event: done`, 22–38 ms.
- k6 SSE runs produced intermittent client-side EOF with no app/provider restart or OOM; `Connection: close` did not resolve it.
- Mocked AI k6 concurrency: NOT ESTABLISHED.
- Real-provider AI: NOT RUN; no external token/cost approval.

## Honest gaps

The normal k6 profile is read-dominant and does not establish capacity for task/timer/invoice mutations. PDF class was not repeatedly benchmarked. R2 transport, mocked-AI k6 SSE, and real-provider AI remain NOT ESTABLISHED. These gaps prohibit a global platform-capacity claim.

## Artifact locations

- `.capacity-runtime/capacity-expected-20260913/`
- `.capacity-runtime/capacity-stress-20260913/`
- `.capacity-runtime/capacity-soak-20260913/`
- `.capacity-runtime/capacity-heavy-rerun-20260914/`
- `.capacity-runtime/capacity-heavy-repeat2-20260914/`
- `.capacity-runtime/capacity-upload-20260914.json`

Large raw outputs were moved outside the repository to private storage at `/root/backups/cubiqlo/capacity-artifacts-20260914/`. Its `manifest.json` records each artifact path, byte size, SHA-256, private classification, and retention through 2026-10-14; manifest SHA-256: `6f9230ded6bc8e301a971d89e8dca82352e91a50cb32398034abeda0bb74797b`. Session credential files were deleted before archival. Raw artifacts are not committed.
