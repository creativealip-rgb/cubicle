#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR=${PROJECT_DIR:-/root/projects/cubicle}
TRAEFIK_CONFIG=${TRAEFIK_CONFIG:-/etc/dokploy/traefik/dynamic/cubiqlo-new.yml}
SERVICE_NAME=${SERVICE_NAME:-cubiqlo-new-service}
PRIMARY_SLOT=${PRIMARY_SLOT:-cubiqlo-new-app-next}
SECONDARY_SLOT=${SECONDARY_SLOT:-cubiqlo-new-app-next-green}
NETWORK=${NETWORK:-dokploy-network}
WAIT_SECONDS=${WAIT_SECONDS:-60}
IMAGE_TAG=${1:-}

[[ -n "$IMAGE_TAG" ]] || { echo "Usage: $0 IMAGE_TAG" >&2; exit 2; }
cd "$PROJECT_DIR"

/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh >/dev/null
docker image inspect "$IMAGE_TAG" >/dev/null
[[ -f "$TRAEFIK_CONFIG" ]] || { echo "ERROR: missing $TRAEFIK_CONFIG" >&2; exit 1; }

active_url=$(python3 - "$TRAEFIK_CONFIG" "$SERVICE_NAME" <<'PY'
import re, sys
text=open(sys.argv[1]).read()
block=re.search(rf'(?ms)^    {re.escape(sys.argv[2])}:\n(.*?)(?=^    \S|\Z)', text)
if not block: raise SystemExit('ERROR: Traefik service block not found')
url=re.search(r'url:\s*["\x27]?http://([^:/"\x27]+):3000', block.group(1))
if not url: raise SystemExit('ERROR: active backend URL not found')
print(url.group(1))
PY
)

case "$active_url" in
  "$PRIMARY_SLOT") candidate=$SECONDARY_SLOT ;;
  "$SECONDARY_SLOT") candidate=$PRIMARY_SLOT ;;
  *) echo "ERROR: unexpected active backend $active_url" >&2; exit 1 ;;
esac

backup_dir=/root/backups/cubiqlo
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
env_file="$backup_dir/prod-env-$stamp.env"
config_backup="$backup_dir/cubiqlo-new-$stamp.yml"
cp "$TRAEFIK_CONFIG" "$config_backup"
chmod 600 "$config_backup"

docker inspect "$active_url" --format '{{range .Config.Env}}{{println .}}{{end}}' |
  grep -Ev '^(PATH|NODE_VERSION|YARN_VERSION|NEXT_TELEMETRY_DISABLED|NODE_ENV|PORT|HOSTNAME)=' > "$env_file"
chmod 600 "$env_file"

old_image=$(docker inspect "$active_url" --format '{{.Config.Image}}')
old_mount=$(docker inspect "$active_url" --format '{{range .Mounts}}{{if eq .Destination "/app/public/uploads/site-images"}}{{.Name}}{{end}}{{end}}')
old_mount=${old_mount:-cubiqlo-site-uploads}

echo "active=$active_url candidate=$candidate image=$IMAGE_TAG"
docker rm -f "$candidate" >/dev/null 2>&1 || true
docker run -d \
  --name "$candidate" \
  --restart unless-stopped \
  --network "$NETWORK" \
  --env-file "$env_file" \
  -v "$old_mount:/app/public/uploads/site-images" \
  "$IMAGE_TAG" >/dev/null

candidate_ok=false
for _ in $(seq 1 "$WAIT_SECONDS"); do
  if docker exec "$candidate" node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{const b=await r.text();process.exit(r.ok && /\"ok\"/.test(b)?0:1)}).catch(()=>process.exit(1))"; then
    candidate_ok=true
    break
  fi
  sleep 1
done
[[ "$candidate_ok" == true ]] || { docker logs --tail 100 "$candidate" >&2; docker rm -f "$candidate" >/dev/null; echo "ERROR: candidate health failed" >&2; exit 1; }

switch_backend() {
  local from=$1 to=$2 tmp
  tmp=$(mktemp "${TRAEFIK_CONFIG}.XXXXXX")
  python3 - "$TRAEFIK_CONFIG" "$tmp" "$SERVICE_NAME" "$from" "$to" <<'PY'
import re, sys
src,tmp,service,old,new=sys.argv[1:]
text=open(src).read()
pattern=rf'(?ms)(^    {re.escape(service)}:\n.*?url:\s*["\x27]?http://){re.escape(old)}(:3000["\x27]?.*?)(?=^    \S|\Z)'
updated,n=re.subn(pattern, rf'\g<1>{new}\g<2>', text, count=1)
if n != 1: raise SystemExit('ERROR: expected one backend URL replacement')
open(tmp,'w').write(updated)
PY
  chmod --reference="$TRAEFIK_CONFIG" "$tmp"
  chown --reference="$TRAEFIK_CONFIG" "$tmp"
  mv "$tmp" "$TRAEFIK_CONFIG"
}

rollback() {
  echo "ROLLBACK: restoring Traefik backend $active_url" >&2
  cp "$config_backup" "$TRAEFIK_CONFIG"
  sleep 2
  docker rm -f "$candidate" >/dev/null 2>&1 || true
}
trap rollback ERR

switch_backend "$active_url" "$candidate"

public_ok=false
for _ in $(seq 1 "$WAIT_SECONDS"); do
  body=$(curl -4 -fsS --max-time 8 https://app.cubiqlo.com/api/health 2>/dev/null || true)
  if grep -q '"ok"' <<<"$body"; then public_ok=true; break; fi
  sleep 1
done
[[ "$public_ok" == true ]] || { echo "ERROR: public health failed after switch" >&2; false; }

# Keep previous slot briefly available during proxy convergence, then stop it.
sleep 10
docker stop "$active_url" >/dev/null
trap - ERR
rm -f "$env_file"

printf 'DEPLOY_OK\nactive=%s\nprevious=%s\nimage=%s\nrollback_image=%s\nhealth=%s\n' \
  "$candidate" "$active_url" "$IMAGE_TAG" "$old_image" "$body"
