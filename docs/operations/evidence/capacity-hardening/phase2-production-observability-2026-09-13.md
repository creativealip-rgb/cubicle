# Phase 2 production observability — 2026-09-13

Production PostgreSQL maintenance completed with fresh custom dump and rollback config at `/root/backups/cubiqlo/phase2-observability-20260913T103621Z/`.

Runtime proof after controlled recreate:

```text
shared_preload_libraries=pg_stat_statements
track_io_timing=on
log_min_duration_statement=500ms
pg_stat_statements extension=queryable
app reconnect=/api/health 200 db=ok
```

Authoritative config: `/opt/cubiqlo-migration/docker-compose.yml`. No public port or proxy change.
