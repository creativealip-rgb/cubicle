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
7. Restore globals only after reviewing role conflicts; restore database with `psql -v ON_ERROR_STOP=1`.
8. Apply only migrations newer than restored ledger state through canonical migration runner.
9. Start app against restored DB on internal Docker network.
10. Verify `/api/health`, login, client/project CRUD read path, invoice read/PDF, client portal token access, and file metadata/download authorization.
11. Restore or reconnect R2 application storage separately; DB restore does not reconstruct object files.
12. Route exact production hosts through `dokploy-traefik` only after smoke tests pass.

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
- Backup watchdog failure and recovery paths were controlled-tested: stale state emitted an alert and exit 1; healthy state was silent with exit 0.
