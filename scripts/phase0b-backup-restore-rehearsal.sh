#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB_CONTAINER=${DB_CONTAINER:-cubicle-pg}
DB_USER=${DB_USER:-postgres}
SOURCE_DB=${SOURCE_DB-}
RESTORE_DB=${RESTORE_DB:-cubicle_dev_phase0b_restore}
BACKUP_DIR=${BACKUP_DIR:-/root/backups/databases/cubiqlo-dev-phase0b}
EVIDENCE_DIR=${EVIDENCE_DIR:-"$ROOT/docs/operations/evidence/phase0b"}

if [[ "$SOURCE_DB" != "cubicle_dev" ]]; then
  echo "SOURCE_DB must be explicitly set to cubicle_dev" >&2
  exit 1
fi
if [[ ! "$RESTORE_DB" =~ ^cubicle_dev_phase0b_[A-Za-z0-9_]+$ ]]; then
  echo "RESTORE_DB must use cubicle_dev_phase0b_* disposable namespace" >&2
  exit 1
fi
if [[ "$RESTORE_DB" == "$SOURCE_DB" || "$RESTORE_DB" == "cubicle" ]]; then
  echo "Refusing unsafe RESTORE_DB=$RESTORE_DB" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR" "$EVIDENCE_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$BACKUP_DIR/cubicle_dev-phase0b-$stamp.dump"
checksum="$backup.sha256"
source_recon="$EVIDENCE_DIR/reconciliation-source-$stamp.tsv"
restore_recon="$EVIDENCE_DIR/reconciliation-restored-$stamp.tsv"
rollback_recon="$EVIDENCE_DIR/reconciliation-rollback-$stamp.tsv"
manifest="$EVIDENCE_DIR/backup-restore-rollback-$stamp.md"
probe_dir=$(mktemp -d)
cleanup() {
  rm -rf "$probe_dir"
  docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$RESTORE_DB" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Guard before any destructive disposable-DB operation.
current_source=$(docker exec "$DB_CONTAINER" psql -X -U "$DB_USER" -d "$SOURCE_DB" -Atc 'SELECT current_database()')
[[ "$current_source" == "$SOURCE_DB" ]]

# Custom-format dump is a transactionally consistent source snapshot.
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$SOURCE_DB" -Fc > "$backup"
sha256sum "$backup" > "$checksum"
sha256sum -c "$checksum" >/dev/null

# Record current source reconciliation. Dev must remain quiescent until comparison completes.
DB_CONTAINER="$DB_CONTAINER" DB_USER="$DB_USER" DB_NAME="$SOURCE_DB" \
  "$ROOT/scripts/phase0b-reconcile.sh" > "$source_recon"

restore_from_backup() {
  docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$RESTORE_DB" >/dev/null
  docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$RESTORE_DB"
  docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$RESTORE_DB" \
    --no-owner --no-privileges < "$backup"
}

restore_from_backup
DB_CONTAINER="$DB_CONTAINER" DB_USER="$DB_USER" DB_NAME="$RESTORE_DB" \
  "$ROOT/scripts/phase0b-reconcile.sh" > "$restore_recon"
cmp -s "$source_recon" "$restore_recon" || {
  diff -u "$source_recon" "$restore_recon" >&2 || true
  echo "Source and restored reconciliation differ" >&2
  exit 1
}

# Rehearse forward mutation only inside disposable DB.
cat > "$probe_dir/9999_phase0b_rollback_probe.sql" <<'SQL'
CREATE TABLE public.phase0b_rollback_probe (
  id integer PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.phase0b_rollback_probe (id) VALUES (1);
SQL
MIGRATION_DIR="$probe_dir" START_MIGRATION=9999 DB_CONTAINER="$DB_CONTAINER" \
  DB_USER="$DB_USER" DB_NAME="$RESTORE_DB" "$ROOT/scripts/migrate-ledger.sh" >/dev/null
probe_after_forward=$(docker exec "$DB_CONTAINER" psql -X -U "$DB_USER" -d "$RESTORE_DB" -Atc \
  "SELECT to_regclass('public.phase0b_rollback_probe') IS NOT NULL")
[[ "$probe_after_forward" == "t" ]]

# Rollback policy for additive migration: replace disposable DB from verified pre-change backup.
restore_from_backup
probe_after_rollback=$(docker exec "$DB_CONTAINER" psql -X -U "$DB_USER" -d "$RESTORE_DB" -Atc \
  "SELECT to_regclass('public.phase0b_rollback_probe') IS NOT NULL")
[[ "$probe_after_rollback" == "f" ]]
DB_CONTAINER="$DB_CONTAINER" DB_USER="$DB_USER" DB_NAME="$RESTORE_DB" \
  "$ROOT/scripts/phase0b-reconcile.sh" > "$rollback_recon"
cmp -s "$source_recon" "$rollback_recon" || {
  diff -u "$source_recon" "$rollback_recon" >&2 || true
  echo "Rollback reconciliation differs from source baseline" >&2
  exit 1
}

backup_hash=$(awk '{print $1}' "$checksum")
backup_size=$(stat -c '%s' "$backup")
source_hash=$(sha256sum "$source_recon" | awk '{print $1}')
restore_hash=$(sha256sum "$restore_recon" | awk '{print $1}')
rollback_hash=$(sha256sum "$rollback_recon" | awk '{print $1}')
nonzero_orphans=$(awk -F '\t' '$1=="orphan" && $3!="0" {count++} END {print count+0}' "$source_recon")

cat > "$manifest" <<EOF
# Phase 0B backup, restore, and rollback rehearsal

- Generated UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')
- Source database: \`$SOURCE_DB\`
- Disposable database: \`$RESTORE_DB\`
- Backup: \`$backup\`
- Backup bytes: \`$backup_size\`
- Backup SHA-256: \`$backup_hash\`
- Checksum verification: PASS
- Restore: PASS
- Source reconciliation SHA-256: \`$source_hash\`
- Restored reconciliation SHA-256: \`$restore_hash\`
- Source/restored exact comparison: PASS
- Forward probe on disposable DB: PASS
- Restore-based rollback: PASS
- Probe absent after rollback: PASS
- Rollback reconciliation SHA-256: \`$rollback_hash\`
- Source/rollback exact comparison: PASS
- Non-zero orphan categories: \`$nonzero_orphans\`

## Rollback command pattern

Only run against disposable/dev target after confirming backup checksum:

\`\`\`bash
sha256sum -c "$checksum"
docker exec "$DB_CONTAINER" dropdb -U "$DB_USER" --if-exists "$RESTORE_DB"
docker exec "$DB_CONTAINER" createdb -U "$DB_USER" "$RESTORE_DB"
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$RESTORE_DB" --no-owner --no-privileges < "$backup"
DB_NAME="$RESTORE_DB" ./scripts/phase0b-reconcile.sh
\`\`\`

Production database was not read, written, dropped, restored, or migrated by this rehearsal.
EOF

printf 'backup=%s\nmanifest=%s\nsource_reconciliation_sha256=%s\nrestore_reconciliation_sha256=%s\nrollback_reconciliation_sha256=%s\n' \
  "$backup" "$manifest" "$source_hash" "$restore_hash" "$rollback_hash"
