# Mutation Functional Baseline — 2026-09-14

## Verdict

`PARTIAL PASS`. This proves repeated authenticated mutation lifecycles with one browser worker. It does not establish concurrent mutation capacity.

## Environment

- Isolated HTTPS origin: `https://app.cubiqlo.test:3443`, bound to loopback `127.0.0.1:3443`.
- Isolated application, PostgreSQL clone, and Redis.
- Production application, DB, Redis, proxy, and object storage were untouched.
- Synthetic Better Auth user/workspace created through the repository QA seed.

## Valid runs

Run 1: 3/3 passed in 22.2 s; command elapsed 23.24 s; runner max RSS 201,052 KiB.

Run 2: 3/3 passed in 20.7 s; command elapsed 21.66 s; runner max RSS 195,996 KiB.

Each run exercised:

- invoice create, persistence, update/payment/status/report lifecycle;
- task create, reload, edit, reload, and delete lifecycle;
- real-time timer direct start, active-state proof, stop, persistence, and reload proof.

## Post-run evidence

- Health: `status=ok`, `db=ok`.
- App/DB/Redis restart count: 0/0/0.
- OOM: false/false/false.
- App/DB/Redis final RAM: 249.3/24.7/3.7 MiB.
- Synthetic active timers before cleanup: 0.
- Negative synthetic invoice totals: 0.
- Orphan tasks: 0.
- Idle-in-transaction sessions: 0.
- Blocked locks: 0.
- App error scan: empty.

Synthetic users, sessions, accounts, memberships, owned workspace, and cascaded fixtures were removed. Residual synthetic users/workspaces: 0/0.

Raw logs are private at `/root/backups/cubiqlo/mutation-capacity-20260914/`; `manifest.sha256` records their checksums. No session cookie or plaintext credential is retained there.

## Remaining capacity work

Use multiple independent synthetic users/workspaces before concurrent load. A single user cannot validly run concurrent real-time timers because the product intentionally allows one active timer per user. Repeat task, timer, and invoice workloads at defined concurrency levels twice, then verify recovery and invariants. Until then, mutation-heavy concurrent capacity remains `NOT ESTABLISHED`.
