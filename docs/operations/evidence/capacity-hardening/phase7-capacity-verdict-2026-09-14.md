# Workload-Specific Capacity Verdict — 2026-09-14

## Executive Summary

Platform capacity across all 5 core workloads has been systematically benchmarked and verified with fresh isolated evidence. The synthetic single-number "100 VU" claim has been invalidated and replaced by reproducible, workload-specific boundaries backed by DB invariants and automated gates.

| Workload Area | Validated Operating Level | Key Guards & Bounds | Evidence Reference |
|---|---|---|---|
| **1. Fast Read / CRUD & DB Queries** | **50 - 100 VUs** (35,000+ requests, p95 253ms) | SQL limit/offset pagination, UTC-aligned aggregation, tenant predicates | `phase6-benchmark-final-2026-09-14.md` |
| **2. Multi-tenant Mixed Mutation** | **3 Concurrent Users** (Task, Invoice, Realtime Timer) | Per-user single active timer constraint, atomic invoice locking | `mutation-concurrent-3vu-2026-09-14.md` |
| **3. PDF & Document Generation** | **2 Concurrent Exports / Workspace** (1 per user, 4 per instance) | Redis Lua atomic semaphore admission, timeout protection, max row limits | `pdf-capacity-2026-09-14.md` |
| **4. Cloudflare R2 Object Storage** | **1 x 5 MiB Full Lifecycle** (Upload, Promotion, Download, Delete) | 25 MiB product max limit (50 MiB rejected 413), atomic upload saga & ledger deletion | `r2-e2e-capacity-2026-09-14.md` |
| **5. AI Assistant & SSE Streaming** | **20 Concurrent Streams** (Deterministic Mock $0) | Atomic per-user monthly quota isolation (`migration 0101`), refund safety, distributed limiter | `ai-sse-capacity-2026-09-14.md` |

---

## Production Deployment & Invariant Status

- Production Image: `cubiqlo-prod:sha-3a2db101218d4c2c915d672af8f2b32fe122f3dc`
- Active Migrations: `0097`, `0098`, `0099`, `0100`, `0101` (applied via dedicated migrator role).
- Reverse Proxy: Ports 80/443 bound exclusively to `dokploy-traefik`. App container publishes zero host ports.
- Health Status: `{"status":"ok","db":"ok"}` with 0 container restarts, 0 OOM events, 0 blocked DB locks.
- Database Observability: `pg_stat_statements` active on PostgreSQL 16 production DB.
