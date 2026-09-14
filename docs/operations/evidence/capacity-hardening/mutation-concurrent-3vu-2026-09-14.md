# Mutation Concurrent Capacity — 3 Users — 2026-09-14

## Verdict

`SAFE TESTED LEVEL`: one task lifecycle, one invoice lifecycle, and one real-time timer lifecycle executed concurrently by three independent users/workspaces. Two repetitions passed. This does not establish capacity above this exact mixed workload.

## Environment

- Isolated HTTPS origin on loopback `127.0.0.1:3443`.
- Isolated application, PostgreSQL clone, and Redis.
- Three independent Better Auth sessions and workspaces used for measured workload; five fixtures were created, but auth policy intentionally limited burst sign-in before the measured run.
- Production application, DB, Redis, proxy, and object storage were untouched.

## Results

Run 1, three workers:

- timer start/active/stop/persist: 7.3 s;
- task create/reload/edit/reload/delete: 15.1 s;
- invoice create/persist/payment/status/report/void: 19.0 s;
- suite: 3/3 passed in 20.3 s; command elapsed 21.41 s; runner max RSS 187,920 KiB.

Run 2, three workers:

- timer: 7.2 s;
- task: 13.7 s;
- invoice: 17.2 s;
- suite: 3/3 passed in 18.8 s; command elapsed 19.73 s; runner max RSS 184,148 KiB.

## Post-run proof

- Synthetic active timers: 0.
- Negative synthetic invoices: 0.
- Orphan synthetic tasks: 0.
- Idle-in-transaction sessions: 0.
- Blocked locks: 0.
- App errors: 0.
- App/DB/Redis restarts: 0/0/0.
- OOM: false/false/false.
- Health: `status=ok`, `db=ok`.
- Final app/DB/Redis RAM: 252.6/27.4/6.0 MiB.

All five synthetic users, sessions, accounts, memberships, owned workspaces, and cascaded fixtures were deleted. Residual users/workspaces: 0/0.

Raw logs are private at `/root/backups/cubiqlo/mutation-concurrent-capacity-20260914/`; `manifest.sha256` records checksums. No session cookie or plaintext credential is retained.

## Limit

Three concurrent independent users is the tested mixed-mutation level. Higher concurrency, longer mutation soak, and different mutation ratios remain `NOT ESTABLISHED`; do not convert this result to registered users or MAU.
