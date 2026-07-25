#!/usr/bin/env bash
set -euo pipefail

SCRIPT=${SCRIPT:-scripts/operations/cubiqlo_staging_preflight.sh}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

write_env() {
  local path=$1 app=$2 auth=$3 db=$4 bucket=$5 payment=$6 email=$7
  {
    printf 'DEPLOY_ENV=staging\n'
    printf 'NEXT_PUBLIC_APP_URL=%s\n' "$app"
    printf 'BETTER_AUTH_URL=%s\n' "$auth"
    printf 'DATABASE_URL=%s\n' "$db"
    printf 'R2_BUCKET_NAME=%s\n' "$bucket"
    printf 'PAKASIR_PROJECT=%s\n' "$payment"
    printf 'EMAIL_FROM=%s\n' "$email"
    printf 'STAGING_PAYMENT_MODE=disabled\n'
    printf 'STAGING_EMAIL_MODE=sink\n'
  } > "$path"
}

expect_pass() {
  local name=$1 file=$2
  "$SCRIPT" "$file" >/dev/null || { printf 'FAIL expected pass: %s\n' "$name"; exit 1; }
}

expect_fail() {
  local name=$1 file=$2
  if "$SCRIPT" "$file" >/dev/null 2>&1; then
    printf 'FAIL expected rejection: %s\n' "$name"
    exit 1
  fi
}

safe="$TMP/safe.env"
write_env "$safe" 'https://staging.cubiqlo.com' 'https://staging.cubiqlo.com' 'postgresql://stage@db:5432/cubicle_staging' 'cubiqlo-staging' '' 'Cubiqlo Staging <qa@staging.cubiqlo.com>'
expect_pass safe "$safe"

for field in app auth db bucket payment email; do
  file="$TMP/$field.env"
  write_env "$file" 'https://staging.cubiqlo.com' 'https://staging.cubiqlo.com' 'postgresql://stage@db:5432/cubicle_staging' 'cubiqlo-staging' '' 'Cubiqlo Staging <qa@staging.cubiqlo.com>'
  case "$field" in
    app) sed -i '/^NEXT_PUBLIC_APP_URL=/c\NEXT_PUBLIC_APP_URL=https://cubiqlo.com' "$file" ;;
    auth) sed -i '/^BETTER_AUTH_URL=/c\BETTER_AUTH_URL=https://app.cubiqlo.com' "$file" ;;
    db) sed -i '/^DATABASE_URL=/s/cubicle_staging/cubicle/' "$file" ;;
    bucket) sed -i '/^R2_BUCKET_NAME=/s/cubiqlo-staging/cubiqlo-production/' "$file" ;;
    payment) sed -i '/^PAKASIR_PROJECT=/c\PAKASIR_PROJECT=production-project' "$file" ;;
    email) sed -i '/^EMAIL_FROM=/s/qa@staging.cubiqlo.com/support@cubiqlo.com/' "$file" ;;
  esac
  expect_fail "$field production collision" "$file"
done

printf 'OK: staging preflight rejects production collisions\n'
