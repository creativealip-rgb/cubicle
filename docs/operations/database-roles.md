# Cubiqlo PostgreSQL Role Model

**Applied:** 25 Juli 2026

## Roles

- `cubiqlo_owner`: `NOLOGIN`; owns public schema and all application tables/functions.
- `cubiqlo_migrator`: `LOGIN`; member of `cubiqlo_owner`; runs ledger migrations with `SET ROLE` through `PGOPTIONS`.
- `cubiqlo_app`: `LOGIN`; runtime only. Has `CONNECT`, schema `USAGE`, table `SELECT/INSERT/UPDATE/DELETE`, sequence `USAGE/SELECT/UPDATE`, and function `EXECUTE`.
- `cubiqlo_backup`: `LOGIN`; read-only table/sequence access and `default_transaction_read_only=on`.
- `postgres`: bootstrap/emergency administration only; application no longer uses it.

All runtime roles are `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, and `NOREPLICATION`.

## Credentials

Stored outside repository:

```text
/root/.secrets/cubiqlo-db-roles.env
```

Permission: `0600`.

Runtime URL is provided by ignored project `.env` key `CUBICLE_DATABASE_URL`. Compose contains no database password.

## Migration command

```bash
cd /root/projects/cubicle
source /root/.secrets/cubiqlo-db-roles.env
DB_USER=cubiqlo_migrator \
DB_PASSWORD="$CUBIQLO_MIGRATOR_PASSWORD" \
DB_HOST=127.0.0.1 \
MIGRATION_ROLE=cubiqlo_owner \
./migrate.sh
```

Runner keeps advisory locking, checksum validation, transaction rollback, and controlled no-op behavior.

## Verified behavior

- App role: reads all 52 tables.
- App role: insert/update/delete test succeeded inside a rolled-back transaction.
- App role: `pg_trgm` function execution succeeded.
- App role: create table/role/database and drop schema denied.
- Backup role: read succeeded; write denied.
- Migrator: DDL via owner membership succeeded; cluster role creation denied.
- Runtime PostgreSQL session user: `cubiqlo_app`.

## Rollback

If application fails after credential switch:

1. Do not change role ownership.
2. Restore previous Compose runtime URL temporarily:

```text
postgresql://postgres:<CUBICLE_DB_PASSWORD>@cubicle-pg:5432/cubicle
```

3. Recreate only app container:

```bash
docker compose up -d --no-deps --force-recreate cubicle
```

4. Verify `/api/health` and logs.
5. Diagnose missing grants, then return to `cubiqlo_app`.

Pre-change backup:

```text
/root/backups/databases/cubiqlo-manual/cubicle-pre-role-split-20260725T130223Z.dump
```

Backup has adjacent SHA256 sidecar and mode `0600`.

## Password rotation

1. Generate random password.
2. `ALTER ROLE` using PostgreSQL bootstrap administrator.
3. Update `/root/.secrets/cubiqlo-db-roles.env`.
4. Update ignored `.env` runtime URL when rotating app role.
5. Recreate only app container.
6. Verify current runtime session uses `cubiqlo_app` and health is green.
7. Never commit credential values.

## Future objects

`ALTER DEFAULT PRIVILEGES FOR ROLE cubiqlo_owner` grants app DML and backup SELECT on future tables. Migrations must run as `cubiqlo_owner` through the migrator role so these defaults apply.
