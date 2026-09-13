# Phase 2 Disposable PostgreSQL Observability Evidence — 2026-09-13

## Scope

Disposable-only rehearsal from latest Phase 0 production backup. No production PostgreSQL configuration, schema, role, container, volume, application, or routing was changed.

Source SHA: `f95884b`
PostgreSQL image: `postgres:16` (`sha256:88a36c64c1003dad93f56daa12d1f8916ec66d1fa3e5fb1fb0ae7cb77efd56d1`)
App smoke image: `cubiqlo-phase1-smoke:f95884b` (`sha256:9c674da3f09e4d0e754ce97fa4a248405c42ac3849f89dbc6939d517efd0eee2`)

## Disposable topology

- PostgreSQL restored into an isolated disposable volume.
- Application connected as `cubiqlo_app`.
- Redis and app containers were disposable.
- No host ports were published.
- No Traefik route was created.
- `dokploy-traefik` remained the only owner of public ports 80/443.

## Tested PostgreSQL command settings

```text
shared_preload_libraries=pg_stat_statements
track_io_timing=on
log_min_duration_statement=500
```

Observed effective settings:

```text
pg_stat_statements|on|500ms
```

## Results

```text
Backup restore:                PASS
Role bootstrap:                PASS
Application health:            PASS
Application DB role:           cubiqlo_app
pg_stat_statements query:       PASS
Collected statement rows:      803
600 ms query slow-log capture:  PASS
DB restart readiness:          PASS
Application reconnect:         PASS
DB container recreation:       PASS
Settings after recreation:     pg_stat_statements|on|500ms
Application after recreation:  PASS
Disposable cleanup:            PASS
```

## Authoritative production path

Production PostgreSQL source discovered during Phase 0:

```text
/opt/cubiqlo-migration/docker-compose.yml
service: postgres
container: cubiqlo-new-pg
volume: cubiqlo-new-pg-data
network: dokploy-network
```

Repository `docker-compose.yml` is not authoritative for production.

## Proposed production config change

Approval-gated future change only: add these arguments to the authoritative PostgreSQL service command, preserving existing image, volume, environment, and network:

```yaml
command:
  - postgres
  - -c
  - shared_preload_libraries=pg_stat_statements
  - -c
  - track_io_timing=on
  - -c
  - log_min_duration_statement=500
```

Production execution must first create and checksum a fresh backup, save the prior compose file and container inspect output, render and inspect the compose config, and obtain explicit approval.

## Rollback contract

If readiness, recovery, application reconnect, integrity probes, or latency gates fail:

1. Restore the saved authoritative compose file.
2. Recreate only PostgreSQL through the same authoritative compose project/path.
3. Verify DB readiness, application health, authentication, and core read/write.
4. Do not restore data backup for a configuration-only failure unless corruption is separately proven and approved.

## Decision

Disposable rehearsal: **PASS**.

Production application: **NO-GO without explicit approval, fresh backup/checksum, exact compose project discovery, maintenance window, and rollback artifact**.
