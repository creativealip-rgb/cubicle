#!/usr/bin/env bash
set -euo pipefail

STATE_DIR=${STATE_DIR:-/root/.local/state/cubiqlo-observability}
STATE_FILE=$STATE_DIR/state
LOCK_FILE=$STATE_DIR/lock
HEALTH_URL=${HEALTH_URL:-https://cubiqlo.com/api/health}
LANDING_URL=${LANDING_URL:-https://cubiqlo.com/}
LOGIN_URL=${LOGIN_URL:-https://cubiqlo.com/login}
AUTH_PROBE_URL=${AUTH_PROBE_URL:-https://cubiqlo.com/api/time/active}
BACKUP_DIR=${BACKUP_DIR:-/root/backups/cubicle}
BACKUP_MAX_AGE_SECONDS=${BACKUP_MAX_AGE_SECONDS:-93600}
DISK_THRESHOLD=${DISK_THRESHOLD:-90}
MEM_THRESHOLD=${MEM_THRESHOLD:-90}
DB_CONNECTION_THRESHOLD=${DB_CONNECTION_THRESHOLD:-80}
FIVE_XX_THRESHOLD=${FIVE_XX_THRESHOLD:-10}
ALERT_REPEAT_SECONDS=${ALERT_REPEAT_SECONDS:-900}
SELF_TEST=false
[[ "${1:-}" == "--self-test" ]] && SELF_TEST=true

mkdir -p "$STATE_DIR"
chmod 700 "$STATE_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

now=$(date +%s)
alerts=()
check_http() {
  local name=$1 url=$2 expected=$3 code
  code=$(curl -LsS -o /dev/null -w '%{http_code}' --max-time 15 "$url" 2>/dev/null || printf 000)
  [[ "$code" == "$expected" ]] || alerts+=("$name HTTP $code (expected $expected)")
}
check_http landing "$LANDING_URL" 200
check_http login "$LOGIN_URL" 200

health=$(curl -fsS --max-time 15 "$HEALTH_URL" 2>/dev/null || true)
if ! grep -q '"status":"ok"' <<<"$health" || ! grep -q '"db":"ok"' <<<"$health"; then
  alerts+=("health endpoint app/DB not ok")
fi
check_http synthetic-auth-boundary "$AUTH_PROBE_URL" 401

for container in cubicle-cubicle-1 cubicle-pg; do
  state=$(docker inspect "$container" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)
  [[ "$state" == healthy || "$state" == running ]] || alerts+=("container $container state=${state:-missing}")
done
redis_replicas=$(docker service ls --format '{{.Name}}|{{.Replicas}}' 2>/dev/null | sed -n 's/^dokploy-redis|//p')
[[ "$redis_replicas" == "1/1" ]] || alerts+=("dokploy-redis replicas=${redis_replicas:-missing}")

read -r max_connections active_connections < <(docker exec cubicle-pg psql -U postgres -d cubicle -AtF' ' -c "select current_setting('max_connections'),count(*) from pg_stat_activity" 2>/dev/null || printf '0 0')
if [[ "$max_connections" =~ ^[0-9]+$ && "$max_connections" -gt 0 ]]; then
  db_pct=$((active_connections * 100 / max_connections))
  (( db_pct < DB_CONNECTION_THRESHOLD )) || alerts+=("DB connections ${active_connections}/${max_connections} (${db_pct}%)")
else
  alerts+=("DB saturation query failed")
fi

disk=$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
mem=$(free | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
(( disk < DISK_THRESHOLD )) || alerts+=("disk ${disk}%")
(( mem < MEM_THRESHOLD )) || alerts+=("memory ${mem}%")

latest=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'cubicle_2*.sql.gz' -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -1 | cut -d' ' -f2-)
if [[ -z "$latest" ]]; then
  alerts+=("backup missing")
else
  age=$((now - $(stat -c %Y "$latest")))
  (( age <= BACKUP_MAX_AGE_SECONDS )) || alerts+=("backup stale age=$((age/3600))h")
  [[ -f "$latest.sha256" ]] || alerts+=("backup checksum sidecar missing")
  if [[ -f "$latest.sha256" ]] && ! sha256sum -c "$latest.sha256" >/dev/null 2>&1; then
    alerts+=("backup checksum invalid")
  fi
fi

since=$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)
five_xx=$(docker logs dokploy-traefik --since "$since" 2>&1 | grep -Ec ' (500|502|503|504) ' || true)
(( five_xx < FIVE_XX_THRESHOLD )) || alerts+=("Traefik 5xx spike count=$five_xx/5m")

$SELF_TEST && alerts+=("controlled monitoring self-test")

current=healthy
((${#alerts[@]})) && current=$(printf '%s\n' "${alerts[@]}" | sha256sum | cut -d' ' -f1)
previous=unknown
last_alert=0
if [[ -f "$STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$STATE_FILE"
  previous=${LAST_STATE:-unknown}
  last_alert=${LAST_ALERT_AT:-0}
fi

emit=false
if [[ "$current" != healthy ]]; then
  [[ "$current" != "$previous" || $((now-last_alert)) -ge "$ALERT_REPEAT_SECONDS" ]] && emit=true
elif [[ "$previous" != healthy && "$previous" != unknown ]]; then
  printf 'RECOVERY Cubiqlo monitoring healthy again | landing/login/health/auth/DB/Redis/backup/resources checked\n'
fi

if $emit; then
  printf 'ALERT Cubiqlo production | %s\n' "$(IFS='; '; echo "${alerts[*]}")"
  last_alert=$now
fi

umask 077
tmp=$(mktemp "$STATE_DIR/.state.XXXXXX")
printf 'LAST_STATE=%q\nLAST_ALERT_AT=%q\n' "$current" "$last_alert" > "$tmp"
mv "$tmp" "$STATE_FILE"
