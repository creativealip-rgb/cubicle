# Cubiqlo Backup, Recovery, and PostgreSQL Observability

## Objectives

- RPO: 24 hours during beta.
- RTO: 2 hours.
- PITR trigger: enable when revenue-critical mutation volume or user expectations make 24-hour RPO unacceptable.

## Backup lanes

### Local recovery copy

- Script: `/root/scripts/cubicle_pg_backup.sh`
- Schedule: `15 19 * * *` UTC (02:15 WIB)
- Output: `/root/backups/cubicle/cubicle_<UTC>.sql.gz`
- Integrity: SHA-256 sidecar.
- Local retention: seven daily and four weekly copies, with 30-day safety cleanup.
- Includes PostgreSQL globals dump.

### Encrypted off-host copy

- Script: `/root/scripts/cubicle_backup_offsite.sh`
- Schedule: `45 19 * * *` UTC (02:45 WIB)
- Destination: Cloudflare R2 under isolated encrypted prefix `database-backups/cubiqlo-encrypted`.
- Encryption: rclone crypt; filenames, directory names, and content encrypted client-side.
- Crypt secret: `/root/.secrets/cubiqlo-backup/`, mode `0600`; never commit or copy beside backup objects.
- Retention: daily 14 days, weekly 12 weeks, monthly 12 months.
- Every run verifies local checksum, uploads encrypted data, downloads/decrypts it to a temporary directory, and byte-compares it with the local dump.
- Every off-host set includes the database dump, matching PostgreSQL globals/roles dump, and both checksum sidecars. Upload fails closed when matching globals are absent.

Current limitation: R2 uses the application storage account and bucket with an isolated encrypted prefix. This survives VPS loss, but does not isolate backup deletion permission from the app storage credential. Create a backup-only R2 bucket and write-limited credential when Cloudflare credential administration is available.

## Restore test

- Script: `/root/scripts/cubicle_pg_restore_test.sh`
- Schedule: `0 20 * * 0` UTC (Sunday 03:00 WIB)
- Restores into throwaway `postgres:16` container without publishing a host port.
- Verifies SHA-256 before restore.
- Requires at least ten public tables and reads row counts from key business tables.
- Container is always removed by EXIT trap.

Latest manual proof, 25 July 2026:

- Source checksum: OK.
- Public tables restored: 51.
- Key tables readable: users, workspaces, clients, projects, tasks, invoices, time_entries, files.

## Disaster recovery sequence

1. Provision clean Docker host and install Docker, Compose, rclone, and repository checkout.
2. Recover runtime secrets from separate secret custody. Do not fetch crypt key from R2 backup path.
3. Configure temporary R2 + crypt remotes from backup-only credentials and crypt secret.
4. Download newest verified daily backup plus checksum.
5. Verify `sha256sum -c` before decompression.
6. Start PostgreSQL matching production major version.
7. Restore globals after reviewing role conflicts. A clean `postgres:16` image already owns role `postgres`; omit only its `CREATE ROLE postgres` and matching `ALTER ROLE postgres WITH ...` statements, then restore all Cubiqlo roles with `ON_ERROR_STOP=1`.
8. Restore database with `psql -v ON_ERROR_STOP=1`. Database-only restore fails on a clean host because objects use `cubiqlo_owner`; matching globals are mandatory.
9. Apply only migrations newer than restored ledger state through canonical migration runner.
10. Start app against restored DB on internal Docker network.
11. Verify `/api/health`, login, client/project CRUD read path, invoice read/PDF, client portal token access, and file metadata/download authorization.
12. Restore or reconnect R2 application storage separately; DB restore does not reconstruct object files.
13. Route exact production hosts through `dokploy-traefik` only after smoke tests pass.

## Full disaster drill proof — 25 July 2026

- Source: newest encrypted Cloudflare R2 daily artifact, downloaded and decrypted during drill instead of read from local backup storage.
- Database and globals SHA-256 checks passed.
- New internal-only Docker network, clean PostgreSQL container, and production app image; no host/public ports or Traefik route.
- Restored 52 public tables, 18 users, 17 clients, and 41 invoices.
- `/api/health` returned DB `ok`; `/login` and `/` returned HTTP 200.
- Technical artifact-to-running-app recovery took 15 seconds, under two-hour RTO. Host provisioning and DNS cutover are outside this measurement.
- EXIT trap removed throwaway containers, temporary config/secrets, and isolated network.

## Authenticated recovery proof — 25 July 2026

- Script: `scripts/operations/cubiqlo_authenticated_recovery_drill.sh`.
- Restored database and matching global roles into a clean internal PostgreSQL container.
- Started an ephemeral Redis container because authentication rate limiting fails closed when `RATE_LIMIT_REDIS_URL` is unavailable. Redis is therefore a required recovery dependency, not optional infrastructure.
- On the recovery database only, selected an existing workspace owner with a credential account, replaced its password with a random Better Auth hash generated from the locked project dependency, and removed its restored sessions. Production credentials and production database were not changed.
- Better Auth email sign-in returned HTTP 200 and issued a session cookie.
- Authenticated probes returned HTTP 200 without login redirects: `/api/auth/get-session`, `/app/dashboard`, `/app/clients`, `/app/projects`, `/app/invoices`, `/app/files`, and `/app/contracts`.
- Measured local artifact-to-authenticated-app time: 11 seconds.
- This is read-path evidence only. No email, payment, upload, create, update, or delete action was executed.

## PostgreSQL capacity baseline — 25 July 2026

- Database size: 16 MB.
- Container limit: 1 GiB RAM, 1 CPU.
- Active DB connections during sample: 1.
- Waiting locks during sample: 0.
- `max_connections`: 100.
- `shared_buffers`: 256 MiB.
- `effective_cache_size`: 768 MiB, aligned with the 1 GiB container limit.
- `work_mem`: 4 MiB.
- `maintenance_work_mem`: 64 MiB.
- Autovacuum: enabled.
- `track_io_timing`: enabled.
- `pg_stat_statements`: preloaded and extension installed; statement collection verified.
- Slow-query logging: `log_min_duration_statement=500` ms.

Maintenance completed after a fresh dump. PostgreSQL was recreated once, the application reconnected without recreation, and `/api/health` returned HTTP 200. Review collected workload before changing indexes or memory again. PgBouncer is not justified at current connection count.

## Monthly review

Automated report:

- Script: `scripts/operations/cubiqlo_monthly_capacity_report.sh`.
- Hermes no-agent job: `cubiqlo-monthly-capacity-report` (`0d91e9007666`).
- Schedule: first day of each month at 02:00 UTC / 09:00 WIB.
- Snapshot history: `/root/backups/cubicle/metrics/capacity-YYYY-MM.bytes` for month-over-month DB growth.
- Alert conditions: root disk at least 85%, local backup older than 26 hours, checksum failure, any waiting lock, transaction older than 10 minutes, connections at least 80% of maximum, or at least 10,000 dead tuples representing at least 20% of live plus dead rows.
- Controlled test on 25 July 2026: healthy state returned `Status: OK`; a synthetic 30-hour-old backup returned exit 1 with `Status: ALERT — backup 30h old`.

Record:

- DB size and growth.
- Connection count versus max.
- Waiting locks and long transactions.
- Dead tuples and last vacuum/analyze timestamps.
- Largest tables and indexes.
- Backup age, local checksum, off-host round-trip result, and restore-test result.
- Top total-time/mean-time queries from `pg_stat_statements`.

## Known operational risks

- VPS root filesystem reached 87% during Phase 6 audit. Safe Docker build-cache pruning reclaimed 10.08 GB and reduced usage to 81%; a 6-hour external watchdog now alerts at 85%.
- General `/root/scripts/backup-all-dbs.sh` also dumps Cubiqlo, creating a duplicate local lane without checksum. Keep temporarily as defense-in-depth; remove Cubiqlo from that generic job only after dedicated lane alerting proves reliable.
- Existing `gdrive:` rclone token is expired (`invalid_grant`) and is not part of Cubiqlo backup flow.
- Backup watchdog failure and recovery paths were controlled-tested: temporary stale/checksum/off-host/restore failure state emitted an alert and exit 1; healthy state was silent with exit 0. A non-executable Hermes wrapper (`0600`) was found and fixed to `0700`; forced scheduler run then completed with status `ok`. Controlled Telegram delivery succeeded with message ID `47795` without changing real backup artifacts.
