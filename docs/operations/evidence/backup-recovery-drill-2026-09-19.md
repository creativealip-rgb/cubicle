# Backup and recovery drill — 2026-09-19

## Scope

Recovery evidence for Cubiqlo production data and production image boot.

Production service was not mutated. All restore, credential reset, login, and protected-route checks ran against disposable Docker resources on an internal-only network.

## Atomic backup set

Latest verified set:

```text
/root/backups/cubiqlo/db/daily/cubiqlo_20260919T035811Z/
```

Files:

```text
database.sql.gz
database.sql.gz.sha256
globals.sql
globals.sql.sha256
manifest.txt
```

Manifest:

```text
timestamp_utc=20260919T035811Z
database=cubicle
postgres_major=16
```

Checksum verification:

```text
database.sql.gz: OK
globals.sql: OK
```

`globals.sql` contains the application roles required for clean-host recovery:

```text
cubiqlo_app
cubiqlo_backup
cubiqlo_migrator
cubiqlo_owner
GRANT cubiqlo_owner TO cubiqlo_migrator
```

The backup watchdog now requires all five files and validates both checksum sidecars.

## Full recovery drill

Disposable resources:

```text
PostgreSQL 16 clean container
Redis 7 clean container
Cubiqlo production image
Internal Docker network only
No public port bindings
No Traefik route
```

Production image:

```text
cubiqlo-prod:sha-5711763721c86659319d41395ae392a45dcb49b1
```

Restore proof:

```text
Roles restored: 4
Workspaces: 62
Users: 61
Clients: 178
Invoices: 138
Unvalidated constraints: 0
```

Authenticated app proof:

```text
POST /api/auth/sign-in/email: 200
GET /api/auth/get-session: 200
GET /app/dashboard with session: 200
Redirect to /login: no
```

Temporary credential reset was applied only inside the disposable recovery database. No production account or production session was changed.

Cleanup proof:

```text
Recovery app container: removed
Recovery Redis container: removed
Recovery PostgreSQL container: removed
Recovery volume: removed
Recovery network: removed
Temporary env and secret files: removed
```

Production health after drill:

```json
{"status":"ok","db":"ok"}
```

## Current recovery status

```text
Database backup: PASS
Global roles backup: PASS
Checksum validation: PASS
Clean database restore: PASS
Production image boot: PASS
Redis dependency: PASS
Authenticated session: PASS
Protected read path: PASS
Cleanup: PASS
Production isolation: PASS
```

## Known limitation

The drill restored `cubiqlo_app` as a role, but the app boot test used the clean-host bootstrap database role because the backup artifact contains SCRAM password hashes, not plaintext runtime secrets.

On a real clean host, restore must inject runtime secrets from the secret manager before starting the app with the least-privilege `cubiqlo_app` role.

## Next gaps

1. Clean-host provisioning, DNS, TLS, and public cutover were not part of this drill.
2. Mutation flows after recovery were not exercised; this pass proved read-path and authenticated session recovery.

## Offsite encrypted backup round-trip

Added after the clean-host drill.

Bucket:

```text
cubiqlo-backups
```

Verified object prefix:

```text
db/daily/cubiqlo_20260919T035811Z/
```

Uploaded encrypted files:

```text
cubiqlo_20260919T035811Z.tar.gz.enc
cubiqlo_20260919T035811Z.tar.gz.enc.sha256
```

Round-trip proof:

```text
Upload to R2: PASS
HEAD object size check: PASS
Download from R2: PASS
Decrypt local archive: PASS
Extract atomic set: PASS
database.sql.gz checksum: PASS
globals.sql checksum: PASS
Restore downloaded artifact with globals: PASS
Counts: roles=4, workspaces=62, users=61, clients=178, invoices=138, unvalidated_constraints=0
```

Automation:

```text
/root/scripts/cubiqlo_offsite_backup.sh
/root/scripts/cubiqlo_offsite_backup_watchdog.sh
```

Cron:

```text
45 2 * * * /root/scripts/cubiqlo_offsite_backup.sh >> /var/log/cubiqlo_offsite_backup.log 2>&1
37 8 * * * /root/scripts/cubiqlo_offsite_backup_watchdog.sh >> /var/log/cubiqlo_offsite_backup_watchdog.log 2>&1
```

Encryption key is stored outside the repo at:

```text
/root/.secrets/cubiqlo-offsite-backup-key.hex
```

Do not commit this key. A full host-loss recovery still requires this key from a separate secret backup.
