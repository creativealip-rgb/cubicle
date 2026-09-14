# PDF Capacity — 2026-09-14

## Verdict

`SAFE WITH POLICY` for six authenticated export routes at the tested shared-workspace contention level. Two runs proved the configured two-export workspace admission ceiling and uninterrupted dashboard reads. Capacity above policy remains intentionally rejected.

## Environment and workload

Isolated HTTPS app, PostgreSQL clone, and Redis. Three independent authenticated users shared one workspace. Each run sent six export requests concurrently plus three dashboard reads. Production was untouched.

Routes: clients list PDF, client detail PDF, invoice PDF, proposal PDF, contract PDF, and timesheet printable export. Timesheet route intentionally returns printable `text/html`; other routes return `application/pdf`.

## Contention results

Run 1: 2 PDF HTTP 200, 4 policy HTTP 429, 3/3 dashboard HTTP 200, total 570.4 ms. Successful PDF latencies: 338.1–360.6 ms. Dashboard reads: 195.2–209.2 ms.

Run 2: 2 PDF HTTP 200, 4 policy HTTP 429, 3/3 dashboard HTTP 200, total 614.3 ms. Successful PDF latencies: 396.0–421.3 ms. Dashboard reads: 191.7–192.9 ms.

This matches policy: one concurrent export per user, two per workspace, four per instance. No 5xx, timeout, transport failure, or CRUD-read failure occurred.

## Renderer coverage

Sequential authenticated proof generated every route successfully:

- clients list: 5,175 bytes, 179.7 ms;
- client detail: 3,084 bytes, 85.0 ms;
- invoice: 20,370 bytes, 253.3 ms;
- proposal: 18,945 bytes, 329.6 ms;
- contract: 15,245 bytes, 173.4 ms;
- timesheet printable HTML: 4,244 bytes, 31.1 ms.

## Post-run proof

Idle-in-transaction sessions 0, blocked locks 0, deadlocks 0, app errors 0, app/DB/Redis restarts 0/0/0, OOM false/false/false. Final RAM: app 198.3 MiB, DB 28.5 MiB, Redis 6.0 MiB.

All synthetic users, sessions, accounts, memberships, workspace, and cascaded fixtures were deleted; residual synthetic users: 0.

Private raw artifacts: `/root/backups/cubiqlo/pdf-capacity-20260914/`. `manifest.sha256` records checksums; no session credential is retained.

## Limit

This proves the exact authenticated six-route profile and admission policy. Client-portal/public-token PDF routes, larger row populations, long PDF soak, and capacity above policy remain `NOT ESTABLISHED`.
