# Phase 5 Export Protection Final Evidence — 2026-09-14

Environment: fresh isolated image `cubiqlo-capacity-working:phase5` (`sha256:6cfbd5dc4c0ef962116f8534fe1475c14dc68e98b03398fffdd34701dc51fe07`) on `127.0.0.1:3201`, isolated PostgreSQL/Redis. Production unchanged.

## Source gates

- Export inventory: `docs/operations/export-endpoint-matrix.json`, 13 endpoints.
- Admission wiring: 13/13 routes.
- Authorization-before-admission/materialization boundary: 13/13 routes.
- Row/range limits: client XLSX 5,000, client PDF 2,000, related projects 10,000, reports transactions/details 10,000, report/date range 366 days.
- Policy: user 1, workspace 2, instance 4; TTL 120s; renew 30s; timeout 90s; user/workspace pressure 429; instance/Redis failure 503.
- Timeout unit proof: cooperative abort returns 504 and exact lease release; non-cooperative work keeps lease until settlement.

## Runtime gates

Fresh image health and authenticated dashboard: HTTP 200.

Real Redis five-way workspace contention plus 100 concurrent authenticated dashboard reads:

```json
{"parallelExports":5,"admitted":2,"denied":3,"crudRequests":100,"crudFailures":0,"crudBatchMs":4124,"releaseRetry":"pass"}
```

Five simultaneous real Report XLSX requests from one user:

```json
[[200,12632,529],[429,51,423],[429,51,419],[429,51,419],[429,51,418]]
```

Result: one admitted by per-user limit; four rejected with 429; successful XLSX 12,632 bytes.

Redis unavailable test on fresh image:

```text
HTTP 503
{"error":"Export admission unavailable"}
```

Redis restarted and returned PONG. No production Redis involved.

## Verdict

Phase 5 source and isolated runtime acceptance: PASS. Synchronous worker threshold retained because bounded real XLSX completed in 529ms and mixed authenticated CRUD had zero failures; production monitoring hold remains release-phase work.
