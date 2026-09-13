#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
PROFILE=${PROFILE:-baseline}; RUN_ID=${RUN_ID:-capacity-$(date -u +%Y%m%dT%H%M%SZ)}
BASE_URL=${CAPACITY_BASE_URL:?CAPACITY_BASE_URL required}; DB_URL=${CAPACITY_DATABASE_URL:?CAPACITY_DATABASE_URL required}
case "$BASE_URL $DB_URL" in *cubiqlo.com*|*cubiqlo-new-pg*) echo PRODUCTION_TARGET_FORBIDDEN >&2; exit 2;; esac
IMAGE='grafana/k6@sha256:1f40432b1cbe7234e977f96c362c9bc550a2d2b583d014dd8669fe40d3e9e755'
test "$(docker image inspect "$IMAGE" --format '{{index .RepoDigests 0}}')" = "$IMAGE"
docker run --rm "$IMAGE" version | grep -q 'k6 v0.54.0'
export CAPACITY_BASE_URL="$BASE_URL" CAPACITY_DATABASE_URL="$DB_URL"
cd "$ROOT"; npm run capacity:seed -- --profile "$PROFILE" --run-id "$RUN_ID"; npm run capacity:auth -- --run-id "$RUN_ID"; npm run capacity:verify -- --run-id "$RUN_ID"; npm run capacity:invariants -- --run-id "$RUN_ID" --phase pre
OUT="$ROOT/.capacity-runtime/$RUN_ID"; docker run --rm --network host -v "$ROOT/scripts/performance/capacity-hardening:/capacity:ro" -v "$OUT:/runtime" "$IMAGE" run --out "json=/runtime/k6-raw.jsonl" -e PROFILE="$PROFILE" -e BASE_URL="$BASE_URL" -e SESSIONS_FILE=/runtime/sessions.json -e SUMMARY_FILE=/runtime/k6-summary.json /capacity/k6/workload.js
npm run capacity:invariants -- --run-id "$RUN_ID" --phase post; gzip -9 "$OUT/k6-raw.jsonl"; sha256sum "$OUT"/* > "$OUT/artifacts.sha256"; echo "$OUT"
