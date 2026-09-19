# Cubiqlo recovery runbook

Use when restoring Cubiqlo on a new host or during a disaster-recovery drill.

## Recovery artifact contract

Each usable recovery point must include one directory with:

```text
database.sql.gz
database.sql.gz.sha256
globals.sql
globals.sql.sha256
manifest.txt
```

Reject a recovery point if any file is missing or checksum validation fails.

```bash
cd /root/backups/cubiqlo/db/daily/<set>
sha256sum -c database.sql.gz.sha256
sha256sum -c globals.sql.sha256
```

## Restore order

1. Start PostgreSQL with no public port.
2. Verify readiness twice.
3. Restore globals first.
4. Create database owned by `cubiqlo_owner`.
5. Restore database.
6. Start Redis.
7. Inject runtime secrets.
8. Start Cubiqlo app image.
9. Verify health, login, session, protected read path.

## Globals restore

A stock PostgreSQL image already has bootstrap role `postgres`. Filter only these two lines before applying `globals.sql`:

```text
CREATE ROLE postgres;
ALTER ROLE postgres WITH ...
```

Do not suppress all role errors. App roles must restore with `ON_ERROR_STOP=1`.

Expected roles:

```text
cubiqlo_app
cubiqlo_backup
cubiqlo_migrator
cubiqlo_owner
```

## Runtime secret injection

Do not expect the backup artifact to contain plaintext role passwords. `globals.sql` stores SCRAM password hashes only.

On a real clean host, inject the runtime database password from the secret manager and build `DATABASE_URL` for the app with the least-privilege runtime role:

```text
postgresql://cubiqlo_app:<secret>@<postgres-host>:5432/cubicle
```

If the secret manager is unavailable, recovery is not complete. Booting with bootstrap `postgres` is acceptable only for an isolated drill to prove app compatibility; it is not the production steady state.

## Minimum acceptance checks

Database:

```sql
select count(*) from pg_roles where rolname in ('cubiqlo_app','cubiqlo_backup','cubiqlo_migrator','cubiqlo_owner');
select count(*) from pg_tables where schemaname='public';
select count(*) from workspaces;
select count(*) from users;
select count(*) from clients;
select count(*) from invoices;
select count(*) from pg_constraint where convalidated=false;
```

App:

```text
GET /api/health -> {"status":"ok","db":"ok"}
GET /login -> 200
POST /api/auth/sign-in/email -> 200
GET /api/auth/get-session -> 200
GET /app/dashboard with cookie -> 200 and not redirected to /login
```

Safety:

```text
No public port bindings during drill
No Traefik route during drill
Disposable network removed
Disposable containers removed
Disposable volume removed
Temporary env and cookie files removed
Production /api/health remains ok after drill
```

## Current local automation

Host scripts:

```text
/root/scripts/cubiqlo_pg_backup.sh
/root/scripts/cubiqlo_backup_watchdog.sh
```

Cron:

```text
17 2 * * * /root/scripts/cubiqlo_pg_backup.sh >> /var/log/cubiqlo_pg_backup.log 2>&1
31 8 * * * /root/scripts/cubiqlo_backup_watchdog.sh >> /var/log/cubiqlo_backup_watchdog.log 2>&1
```

These scripts live on the VPS, not in the repo. Keep repo docs sanitized; never commit plaintext secrets or dump files.

## Offsite requirement

Local backups protect against bad deploys and accidental data damage. They do not protect against disk loss or host compromise.

Next hardening step:

1. Configure encrypted offsite storage.
2. Upload complete backup set.
3. Download and decrypt to a temporary directory.
4. Verify checksums match local artifact.
5. Restore from the downloaded artifact in a disposable environment.
6. Only then mark offsite recovery as PASS.
