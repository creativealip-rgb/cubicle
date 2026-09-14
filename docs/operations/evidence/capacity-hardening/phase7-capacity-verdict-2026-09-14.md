# Phase 7 Workload-Specific Capacity Verdict — 2026-09-14

Hardware context: isolated benchmark stack on current VPS. These are tested workload ceilings, not registered-user or MAU claims.

| Workload | Highest sustained passing concurrency | Duration | Evidence | Verdict |
|---|---:|---:|---|---|
| Normal authenticated reads | 100 VU | 30m | 35,285 requests, 0% error, p95 253 ms | SAFE TESTED CEILING |
| Normal authenticated reads soak | 50 VU | 2h | 71,079 requests, 0% error, p95 161 ms; recovery PASS | SAFE SOAK LEVEL |
| DB-heavy annual report | 10 VU | 5m ×2 | p95 170/205 ms | SAFE TESTED CEILING |
| Upload validation 5 MiB | 4 parallel | bounded run | 41 ms, 1.12 MiB heap delta | SAFE VALIDATOR ONLY |
| Upload validation 50 MiB | 4 parallel | bounded run | 325 ms, 716 KiB heap delta | SAFE VALIDATOR ONLY |
| XLSX export | 1/user, 2/workspace, 4/instance policy | 5m ×2 plus contention | p95 191/230 ms; CRUD interference zero failures | SAFE WITH POLICY |
| PDF export | not repeatedly measured | n/a | source guards only | NOT ESTABLISHED |
| Task/timer/invoice mutations | not isolated and repeated | n/a | read-dominant profile | NOT ESTABLISHED |
| R2 upload transport | not run | n/a | validator only | NOT ESTABLISHED |
| AI mocked direct HTTP | 1 sequential synthetic user | 10 requests | 10/10, 22–38 ms | INTEGRATION PASS, CAPACITY NOT ESTABLISHED |
| AI mocked k6 SSE | 1–2 VU | rejected runs | intermittent k6 EOF | NOT ESTABLISHED |
| AI real provider | not run | n/a | no cost approval | NOT ESTABLISHED |

## Operational limits

- Normal read safe operating hypothesis: **80 concurrent VU**, applying predeclared 80% headroom to repeatedly passing 100-VU stress ceiling. This is not a claim of 80 simultaneously active browser users across every feature.
- DB-heavy safe operating hypothesis: **8 concurrent annual-report operations**, applying 80% headroom to the repeatedly passing 10-VU result.
- XLSX hard policy remains **1/user, 2/workspace, 4/instance**; policy is stricter than measured render speed to preserve normal traffic.
- Upload 5/50 MiB operational concurrency beyond validator-only runs is NOT ESTABLISHED until isolated R2-compatible transport testing.
- PDF, mutation-heavy, mocked-AI SSE, real-provider AI, registered users, and MAU: NOT ESTABLISHED.

## Bottlenecks and triggers

No CPU, RAM, DB, Redis, restart, OOM, invariant, or latency bottleneck appeared in passing read/report/XLSX stages. First enforced bottleneck is export admission policy. Add capacity only after telemetry shows sustained CPU >70%, RAM >80%, DB connections >70%, repeated normalized query p95 >=500 ms, or workload-specific SLO failure.

## Decision

Current evidence supports normal authenticated read traffic up to tested 100 VU and operational planning at 80 VU headroom, plus 8 concurrent DB-heavy annual reports and guarded XLSX export. It does not support one global "concurrent users" number for all Cubiqlo features.

Source release, production canary, 30-minute monitoring hold, and live QA remain separate release gates.
