#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=${1:-}
[[ -n "$ENV_FILE" && -f "$ENV_FILE" ]] || {
  printf 'ERROR: staging env file required\n' >&2
  exit 1
}

get_env() {
  local key=$1 line
  line=$(grep -m1 "^${key}=" "$ENV_FILE" || true)
  printf '%s' "${line#*=}"
}

fail() {
  printf 'ERROR: staging preflight: %s\n' "$1" >&2
  exit 1
}

require_value() {
  local key=$1 value
  value=$(get_env "$key")
  [[ -n "$value" ]] || fail "$key missing"
  printf '%s' "$value"
}

deploy_env=$(require_value DEPLOY_ENV)
app_url=$(require_value NEXT_PUBLIC_APP_URL)
auth_url=$(require_value BETTER_AUTH_URL)
database_url=$(require_value DATABASE_URL)
r2_bucket=$(require_value R2_BUCKET_NAME)
pakasir_project=$(get_env PAKASIR_PROJECT)
email_from=$(require_value EMAIL_FROM)
payment_mode=$(require_value STAGING_PAYMENT_MODE)
email_mode=$(require_value STAGING_EMAIL_MODE)

[[ "$deploy_env" == staging ]] || fail 'DEPLOY_ENV must equal staging'
[[ "$app_url" == 'https://staging.cubiqlo.com' ]] || fail 'NEXT_PUBLIC_APP_URL must use exact staging host'
[[ "$auth_url" == 'https://staging.cubiqlo.com' ]] || fail 'BETTER_AUTH_URL must use exact staging host'
[[ "$database_url" == */cubicle_staging* ]] || fail 'DATABASE_URL must target cubicle_staging'
[[ "$database_url" != */cubicle && "$database_url" != */cubicle\?* ]] || fail 'production database forbidden'
[[ "$r2_bucket" == *staging* ]] || fail 'R2 bucket must be staging-isolated'
[[ "$r2_bucket" != *production* && "$r2_bucket" != cubiqlo ]] || fail 'production R2 bucket forbidden'
[[ -z "$pakasir_project" ]] || fail 'PAKASIR_PROJECT must be empty in staging'
[[ "$payment_mode" == disabled || "$payment_mode" == sandbox ]] || fail 'payment mode must be disabled or sandbox'
[[ "$email_mode" == sink ]] || fail 'email mode must equal sink'
[[ "$email_from" == *'@staging.cubiqlo.com'* || "$email_from" == *'@example.test'* ]] || fail 'EMAIL_FROM must use staging/test domain'

printf 'OK: staging environment contract verified\n'
