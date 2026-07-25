#!/usr/bin/env bash
# Cubiqlo off-host encrypted backup to Cloudflare R2.
set -euo pipefail

BACKUP_DIR="/root/backups/cubicle"
APP_CONTAINER="cubicle-cubicle-1"
CRYPT_SECRET="/root/.secrets/cubiqlo-backup/rclone-crypt-password.obscured"
TMP_CONFIG=$(mktemp)
VERIFY_DIR=$(mktemp -d)
trap 'rm -f "$TMP_CONFIG"; rm -rf "$VERIFY_DIR"' EXIT
chmod 600 "$TMP_CONFIG"

if ! docker inspect "$APP_CONTAINER" >/dev/null 2>&1 || [[ ! -r "$CRYPT_SECRET" ]]; then
  echo "FAIL: R2 environment or crypt secret missing" >&2
  exit 1
fi

container_env() {
  local key="$1"
  docker inspect "$APP_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | sed -n "s/^${key}=//p" | head -1
}
R2_ACCOUNT_ID=$(container_env R2_ACCOUNT_ID)
R2_ACCESS_KEY_ID=$(container_env R2_ACCESS_KEY_ID)
R2_SECRET_ACCESS_KEY=$(container_env R2_SECRET_ACCESS_KEY)
R2_BUCKET_NAME=$(container_env R2_BUCKET_NAME)
: "${R2_ACCOUNT_ID:?missing R2_ACCOUNT_ID}"
: "${R2_ACCESS_KEY_ID:?missing R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?missing R2_SECRET_ACCESS_KEY}"
: "${R2_BUCKET_NAME:?missing R2_BUCKET_NAME}"

LATEST=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'cubicle_2*.sql.gz' -mmin -1500 -printf '%T@ %p\n' | sort -nr | head -1 | cut -d' ' -f2-)
if [[ -z "$LATEST" ]]; then
  echo "FAIL: no Cubiqlo backup newer than 25 hours" >&2
  exit 1
fi
sha256sum -c "$LATEST.sha256"

CRYPT_PASSWORD=$(<"$CRYPT_SECRET")
cat > "$TMP_CONFIG" <<EOF
[r2]
type = s3
provider = Cloudflare
access_key_id = ${R2_ACCESS_KEY_ID}
secret_access_key = ${R2_SECRET_ACCESS_KEY}
endpoint = https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com
no_check_bucket = true

[cubiqlo-backup-crypt]
type = crypt
remote = r2:${R2_BUCKET_NAME}/database-backups/cubiqlo-encrypted
password = ${CRYPT_PASSWORD}
filename_encryption = standard
directory_name_encryption = true
EOF
unset R2_SECRET_ACCESS_KEY R2_ACCESS_KEY_ID CRYPT_PASSWORD

NAME=$(basename "$LATEST")
DATE=$(date -u +%Y/%m/%d)
DAILY="daily/$DATE/$NAME"
rclone --config "$TMP_CONFIG" copyto "$LATEST" "cubiqlo-backup-crypt:$DAILY" --immutable
rclone --config "$TMP_CONFIG" copyto "$LATEST.sha256" "cubiqlo-backup-crypt:$DAILY.sha256" --immutable

# Round-trip verification proves encrypted remote object decrypts to original bytes.
rclone --config "$TMP_CONFIG" copyto "cubiqlo-backup-crypt:$DAILY" "$VERIFY_DIR/$NAME"
cmp -s "$LATEST" "$VERIFY_DIR/$NAME"
sha256sum -c "$LATEST.sha256"

# Promote same verified artifact to weekly Sunday and monthly first-day retention tiers.
DOW=$(date -u +%u)
DOM=$(date -u +%d)
if [[ "$DOW" == "7" ]]; then
  rclone --config "$TMP_CONFIG" copyto "$LATEST" "cubiqlo-backup-crypt:weekly/$(date -u +%G-W%V)/$NAME" --immutable
fi
if [[ "$DOM" == "01" ]]; then
  rclone --config "$TMP_CONFIG" copyto "$LATEST" "cubiqlo-backup-crypt:monthly/$(date -u +%Y-%m)/$NAME" --immutable
fi

# Retention: daily 14d, weekly 12w, monthly 12mo.
rclone --config "$TMP_CONFIG" delete "cubiqlo-backup-crypt:daily" --min-age 14d --rmdirs || true
rclone --config "$TMP_CONFIG" delete "cubiqlo-backup-crypt:weekly" --min-age 84d --rmdirs || true
rclone --config "$TMP_CONFIG" delete "cubiqlo-backup-crypt:monthly" --min-age 366d --rmdirs || true

printf 'OK: encrypted off-host backup verified: %s\n' "$DAILY"
