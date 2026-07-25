#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=${PROJECT_DIR:-/root/projects/cubicle}
RELEASE_DIR=${RELEASE_DIR:-/root/releases/cubiqlo}
MANIFEST=${1:-$RELEASE_DIR/current.env}
HEALTH_URL=${HEALTH_URL:-https://cubiqlo.com/api/health}
SMOKE_URLS=${SMOKE_URLS:-"https://cubiqlo.com/ https://cubiqlo.com/login"}
WAIT_SECONDS=${WAIT_SECONDS:-120}
STATE_FILE=$RELEASE_DIR/deployed.env
PREVIOUS_FILE=$RELEASE_DIR/previous.env

cd "$PROJECT_DIR"
[[ -f "$MANIFEST" ]] || { echo "ERROR: release manifest not found: $MANIFEST" >&2; exit 1; }

# shellcheck disable=SC1090
source "$MANIFEST"
: "${IMAGE_TAG:?missing IMAGE_TAG}"
: "${IMAGE_ID:?missing IMAGE_ID}"
: "${SOURCE_SHA:?missing SOURCE_SHA}"

actual_id=$(docker image inspect "$IMAGE_TAG" --format '{{.Id}}' 2>/dev/null || true)
[[ "$actual_id" == "$IMAGE_ID" ]] || { echo "ERROR: image ID does not match manifest" >&2; exit 1; }
revision=$(docker image inspect "$IMAGE_TAG" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
[[ "$revision" == "$SOURCE_SHA" ]] || { echo "ERROR: image revision does not match manifest" >&2; exit 1; }

/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh
owners=$(docker ps --format '{{.Names}}|{{.Ports}}' | grep -E '0\.0\.0\.0:(80|443)->' || true)
[[ -n "$owners" ]] || { echo "ERROR: no public proxy owns 80/443" >&2; exit 1; }
if grep -v '^dokploy-traefik|' <<<"$owners" | grep -q .; then
  echo "ERROR: service other than dokploy-traefik owns 80/443" >&2
  exit 1
fi

old_ref=$(docker inspect cubicle-cubicle-1 --format '{{.Config.Image}}')
old_id=$(docker inspect cubicle-cubicle-1 --format '{{.Image}}')
old_revision=$(docker image inspect "$old_id" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null || true)
mkdir -p "$RELEASE_DIR"
tmp=$(mktemp "$RELEASE_DIR/.previous.XXXXXX")
{
  printf 'IMAGE_TAG=%q\n' "$old_ref"
  printf 'IMAGE_ID=%q\n' "$old_id"
  printf 'SOURCE_SHA=%q\n' "$old_revision"
  printf 'RECORDED_AT=%q\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$tmp"
chmod 600 "$tmp"
mv "$tmp" "$PREVIOUS_FILE"

rollback() {
  echo "DEPLOY_GATE_FAILED: rolling back to $old_ref ($old_id)" >&2
  CUBIQLO_IMAGE="$old_id" docker compose up -d --no-deps --no-build --force-recreate cubicle >/dev/null
  for _ in $(seq 1 "$WAIT_SECONDS"); do
    state=$(docker inspect cubicle-cubicle-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)
    [[ "$state" == "healthy" ]] && break
    sleep 1
  done
  curl -fsS --max-time 20 "$HEALTH_URL" >/dev/null
  echo "ROLLBACK_OK image=$old_id" >&2
}
trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback || true; fi; exit $rc' EXIT

CUBIQLO_IMAGE="$IMAGE_TAG" docker compose up -d --no-deps --no-build --force-recreate cubicle

for _ in $(seq 1 "$WAIT_SECONDS"); do
  state=$(docker inspect cubicle-cubicle-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)
  [[ "$state" == "healthy" ]] && break
  [[ "$state" == "unhealthy" ]] && { echo "ERROR: container unhealthy" >&2; false; }
  sleep 1
done
[[ "${state:-}" == "healthy" ]] || { echo "ERROR: health timeout" >&2; false; }

health=$(curl -fsS --max-time 20 "$HEALTH_URL")
grep -q '"status":"ok"' <<<"$health"
grep -q '"db":"ok"' <<<"$health"
for url in $SMOKE_URLS; do
  code=$(curl -LsS -o /dev/null -w '%{http_code}' --max-time 20 "$url")
  [[ "$code" == "200" ]] || { echo "ERROR: smoke failed $url HTTP $code" >&2; false; }
done

new_id=$(docker inspect cubicle-cubicle-1 --format '{{.Image}}')
[[ "$new_id" == "$IMAGE_ID" ]] || { echo "ERROR: running image differs from manifest" >&2; false; }

cp "$MANIFEST" "$STATE_FILE"
chmod 600 "$STATE_FILE"
trap - EXIT
printf 'DEPLOY_OK\nimage=%s\nimage_id=%s\nprevious_image_id=%s\nhealth=%s\n' "$IMAGE_TAG" "$new_id" "$old_id" "$health"
