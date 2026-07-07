#!/bin/bash
# Run SQL migrations against the cubicle-pg container
# Usage: ./migrate.sh

set -e

MIGRATION_DIR="$(dirname "$0")/drizzle"

if [ ! -d "$MIGRATION_DIR" ]; then
  echo "No drizzle/ directory found"
  exit 0
fi

SQL_FILES=$(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$SQL_FILES" ]; then
  echo "No SQL files found"
  exit 0
fi

echo "Running migrations..."

for f in $SQL_FILES; do
  filename=$(basename "$f")
  echo -n "  $filename ... "
  if docker exec -i cubicle-pg psql -U postgres -d cubicle < "$f" 2>/tmp/migrate_err.txt; then
    echo "✓"
  else
    # Check if it's just an idempotent error
    if grep -qi "already exists" /tmp/migrate_err.txt; then
      echo "⚠ (already applied)"
    else
      echo "✗"
      cat /tmp/migrate_err.txt
    fi
  fi
done

echo "Done."
