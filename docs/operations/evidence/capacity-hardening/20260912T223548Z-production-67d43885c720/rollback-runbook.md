# Phase 0 Rollback Runbook

Phase 0 made no schema, credential, config, app-container, or DB-container mutation. No runtime rollback required.

## Current rollback point
- App image: `cubiqlo-prod:sha-893c84d68b860c847591356bba93c6496ab1266d`
- Production DB config source: `/opt/cubiqlo-migration/docker-compose.yml`
- Production DB volume: `cubiqlo-new-pg-data`
- Fresh logical backup: `/root/backups/cubiqlo/capacity-hardening/cubicle-20260912T223548Z-production-67d43885c720.dump`

## Future Phase 1/2 rule
Before credential/config mutation, capture secret handles without values, exact recreate command, previous config checksum, current app/DB images, and explicit approval. Credential failure restores prior secret handle and app image. PostgreSQL config failure restores prior authoritative config and recreates only DB through `/opt/cubiqlo-migration`; logical restore requires separately proven corruption and approval.
