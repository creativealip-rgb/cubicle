# Phase 0B backup, restore, and rollback rehearsal

- Generated UTC: 2026-07-27T17:33:11Z
- Source database: `cubicle_dev`
- Disposable database: `cubicle_dev_phase0b_restore`
- Backup: `/root/backups/databases/cubiqlo-dev-phase0b/cubicle_dev-phase0b-20260727T173307Z.dump`
- Backup bytes: `281347`
- Backup SHA-256: `6de0add6fe88e5fa72e116b1e2dbbdd98666bbff500e419dbcdb72605b511e31`
- Checksum verification: PASS
- Restore: PASS
- Source reconciliation SHA-256: `8068dc935074ba054e9839c4223bb381fe3972fa082fbdff17a8a078a20ade78`
- Restored reconciliation SHA-256: `8068dc935074ba054e9839c4223bb381fe3972fa082fbdff17a8a078a20ade78`
- Source/restored exact comparison: PASS
- Forward probe on disposable DB: PASS
- Restore-based rollback: PASS
- Probe absent after rollback: PASS
- Rollback reconciliation SHA-256: `8068dc935074ba054e9839c4223bb381fe3972fa082fbdff17a8a078a20ade78`
- Source/rollback exact comparison: PASS
- Non-zero orphan categories: `1`

## Rollback command pattern

Only run against disposable/dev target after confirming backup checksum:

```bash
sha256sum -c "/root/backups/databases/cubiqlo-dev-phase0b/cubicle_dev-phase0b-20260727T173307Z.dump.sha256"
docker exec "cubicle-pg" dropdb -U "postgres" --if-exists "cubicle_dev_phase0b_restore"
docker exec "cubicle-pg" createdb -U "postgres" "cubicle_dev_phase0b_restore"
docker exec -i "cubicle-pg" pg_restore -U "postgres" -d "cubicle_dev_phase0b_restore" --no-owner --no-privileges < "/root/backups/databases/cubiqlo-dev-phase0b/cubicle_dev-phase0b-20260727T173307Z.dump"
DB_NAME="cubicle_dev_phase0b_restore" ./scripts/phase0b-reconcile.sh
```

Production database was not read, written, dropped, restored, or migrated by this rehearsal.
