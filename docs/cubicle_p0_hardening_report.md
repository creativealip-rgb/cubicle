# Cubicle P0 Security Hardening Report

Date: 2026-06-16

## Summary

After rogue /tmp/postgresql incident in cubicle-pg, P0 hardening has been applied.

Status:

```text
DB password rotated: YES
Better-Auth secret rotated: YES
DB public port closed: YES
DB auth changed trust -> scram-sha-256: YES
Container redefined via compose with security: YES
Resource limits added: YES
Rogue /tmp/postgresql post-startup check: clean
Live HTTPS still 200/307: YES
```

## Changes

### 1. PostgreSQL hardening

Before:

```text
pg_hba.conf = trust
POSTGRES_HOST_AUTH_METHOD=trust
DB port 5432 exposed publicly
postgres user had no password
wog superuser unknown origin
```

After:

```text
pg_hba.conf scram-sha-256 for local, 127.0.0.1/32, 10.0.1.0/24
pg_hba.conf reject for 0.0.0.0/0
postgres user has new strong password
wog role still exists (review later)
```

### 2. Database port exposure closed

```text
Before: 0.0.0.0:5432 publicly listening
After:  cubicle-pg exposed only inside dokploy-network
```

### 3. Database password rotated

```text
New postgres password stored at /tmp/cubicle_secrets.txt (chmod 600)
CUBICLE_DB_PASSWORD appended to /root/projek/cubicle/.env (chmod 600)
DATABASE_URL inside app now contains new password
```

### 4. Better-Auth secret rotated

```text
New secret stored at /tmp/cubicle_secrets.txt
CUBICLE_BETTER_AUTH_SECRET in /root/projek/cubicle/.env
Container env updated
```

### 5. docker-compose.yml

Updated services:

```text
cubicle-pg: image postgres:16, env scram-sha-256, no host port, healthcheck
cubicle:     build args for all env, no host port, depends_on healthy db
```

Both services now include:

```text
deploy.resources.limits
logging rotation
restart unless-stopped
```

### 6. SSH brute force observed

Found:

```text
Multiple invalid users from random IPs trying root password
osk, arnold, teaspeak, admin1234, test, www, user
```

Recommendation:

```text
enable ufw and limit SSH by IP
or install fail2ban
or move SSH to non-standard port
```

### 7. System cron jobs

All visible jobs look expected (hermes, monev, nggawe backup, contenly backup, sysstat, etc).
No malicious cron found.

## Pending review

```text
1. Drop wog superuser
2. SSH brute force mitigation (ufw or fail2ban)
3. Confirm rogue does not return after 24h
4. Decide on permanent secret storage
5. Migrate to env_file for compose
```

## Live verified

```text
https://cubicle.168-144-37-19.sslip.io/                200
https://cubicle.168-144-37-19.sslip.io/login           200
https://cubicle.168-144-37-19.sslip.io/signup          200
https://cubicle.168-144-37-19.sslip.io/app/dashboard   307
```

Containers:

```text
cubicle-pg        Up 43 seconds (healthy)
cubicle-cubicle-1 Up 11 seconds
```

DB internal auth:

```text
no password: fe_sendauth: no password supplied (rejected)
with password: current_user=postgres current_database=cubicle
```

DB port on host:

```text
no_public_5432
```

Rogue check post-startup:

```text
no_tmp_postgresql
no rogue processes
```
