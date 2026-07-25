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
- `shared_buffers`: 128 MiB.
- `effective_cache_size`: 4 GiB; exceeds container limit and must be reviewed before tuning.
- `work_mem`: 4 MiB.
- `maintenance_work_mem`: 64 MiB.
- Autovacuum: enabled.
- `track_io_timing`: disabled.
- `pg_stat_statements`: not loaded.

Do not tune from assumptions. Capture workload first. Enabling `pg_stat_statements` and `track_io_timing` needs config/restart planning and a controlled PostgreSQL restart. Review memory budget and perform health + app smoke test in a maintenance window. PgBouncer is not justified at current connection count.

## Monthly review

Record:

- DB size and growth.
- Connection count versus max.
- Waiting locks and long transactions.
- Dead tuples and last vacuum/analyze timestamps.
- Largest tables and indexes.
- Backup age, local checksum, off-host round-trip result, and restore-test result.
- Top total-time/mean-time queries after `pg_stat_statements` is enabled.

## Known operational risks

- VPS root filesystem was 87% used during Phase 6 audit. Database backups are small, but host disk needs separate cleanup/monitoring.
- General `/root/scripts/backup-all-dbs.sh` also dumps Cubiqlo, creating a duplicate local lane without checksum. Keep temporarily as defense-in-depth; remove Cubiqlo from that generic job only after dedicated lane alerting proves reliable.
- Existing `gdrive:` rclone token is expired (`invalid_grant`) and is not part of Cubiqlo backup flow.
- Failure alert delivery still needs controlled testing; cron log alone is not an external alert.
