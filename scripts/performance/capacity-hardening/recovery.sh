#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${CAPACITY_BASE_URL:?CAPACITY_BASE_URL required}"
OUT="${1:?output csv required}"
case "$BASE_URL" in *cubiqlo.com*) echo PRODUCTION_TARGET_FORBIDDEN >&2; exit 2;; esac
printf 'timestamp,health_ms,http_status,app_cpu,app_mem_bytes,db_cpu,db_mem_bytes,redis_cpu,redis_mem_bytes\n' > "$OUT"
for _ in $(seq 1 "${SAMPLES:-180}"); do
  ts=$(date -u +%FT%TZ)
  result=$(curl -sS -o /tmp/cubiqlo-capacity-health.$$ -w '%{time_total},%{http_code}' --max-time 5 "$BASE_URL/api/health" || printf '5.000,000')
  health_ms=$(awk -F, '{printf "%.0f",$1*1000}' <<<"$result")
  status=${result##*,}
  stats=$(docker stats --no-stream --format '{{.Name}},{{.CPUPerc}},{{.MemUsage}}' cubiqlo-capacity-app cubiqlo-capacity-db cubiqlo-capacity-redis)
  parse(){ awk -F, -v n="$1" '$1==n{gsub(/%/,"",$2); split($3,a," "); v=a[1]; u=a[2]; m=1; if(u=="KiB")m=1024;else if(u=="MiB")m=1048576;else if(u=="GiB")m=1073741824; printf "%s,%.0f",$2,v*m}' <<<"$stats"; }
  printf '%s,%s,%s,%s,%s,%s\n' "$ts" "$health_ms" "$status" "$(parse cubiqlo-capacity-app)" "$(parse cubiqlo-capacity-db)" "$(parse cubiqlo-capacity-redis)" >> "$OUT"
  [[ "$status" == 200 ]] || exit 3
  sleep 5
done
rm -f /tmp/cubiqlo-capacity-health.$$
