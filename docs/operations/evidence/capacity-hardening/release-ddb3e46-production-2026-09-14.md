# Capacity Hardening Production Release — 2026-09-14

- Source/image revision: `ddb3e46f062b81bbec3f6357954d73d1828b0945`
- Image: `cubiqlo-prod:sha-ddb3e46f062b81bbec3f6357954d73d1828b0945`
- Container: `cubiqlo-new-app-next`, `dokploy-network`, no host port binding.
- Rollback/env evidence: `/root/backups/cubiqlo/release-ddb3e46-20260914T012023Z/` (private, mode 600 env).
- Public proxy: `dokploy-traefik` sole owner of 80/443.

## 30-minute hold

- 360/360 samples passed.
- HTTP failures: 0.
- p50/p95/p99/max: 47.8/70.5/96.1/129.4 ms.
- Restart/OOM: 0/0.
- Final app/DB/Redis RAM: 138.4/44.8/2.0 MiB.
- DB connections 9, active 1, idle-in-transaction 0, waiting 0, blocked locks 0, deadlocks 0, temp bytes 0.

## Authenticated smoke

- Client create/reload/edit/reload/archive/delete: PASS.
- Global file upload/reload/download/delete: PASS.
- Reports page: PASS, zero page errors.
- Report XLSX: HTTP 200, 12,634 bytes.
- Unauthenticated report XLSX: HTTP 401.
- Public and internal health: `status=ok`, `db=ok`.

Two malformed external Server Action probes (`Received "x"`) appeared during hold; no restart, OOM, health failure, DB lock, or QA-flow failure resulted. No new file residue remained. Older QA-prefixed client rows predate this release and were left untouched.

## Verdict

Release gate: PASS. Global product-capacity claim remains prohibited: mutation-heavy capacity, repeated PDF capacity, R2 provider transport, k6 AI SSE, real-provider AI, registered users, and MAU remain `NOT ESTABLISHED`.
