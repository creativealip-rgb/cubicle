#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=${PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}
EXPECTED_BRANCH=${EXPECTED_BRANCH:-dev/integration}
LOCK_DIR=${LOCK_DIR:-/root/.hermes/shared-workspace/locks}
LOCK_FILE=${LOCK_FILE:-$LOCK_DIR/cubiqlo-dev-deploy.lock}
ENV_FILE=${ENV_FILE:-/root/projects/cubicle/.env.development.local}
WAIT_SECONDS=${WAIT_SECONDS:-180}
DRY_RUN=${DRY_RUN:-0}

cd "$PROJECT_DIR"
mkdir -p "$LOCK_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "ERROR: another Cubiqlo shared-dev deploy holds $LOCK_FILE" >&2
  exit 75
fi

branch=$(git branch --show-current)
[[ "$branch" == "$EXPECTED_BRANCH" ]] || {
  echo "ERROR: shared dev may deploy only from $EXPECTED_BRANCH (current: ${branch:-detached})" >&2
  exit 2
}
[[ -z "$(git status --porcelain)" ]] || { echo "ERROR: integration worktree is dirty" >&2; exit 3; }

git fetch origin --prune
local_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse "origin/$EXPECTED_BRANCH" 2>/dev/null || true)
[[ -n "$remote_sha" && "$local_sha" == "$remote_sha" ]] || {
  echo "ERROR: local $EXPECTED_BRANCH must equal origin/$EXPECTED_BRANCH before deploy" >&2
  echo "local=$local_sha remote=${remote_sha:-missing}" >&2
  exit 4
}
[[ -f "$ENV_FILE" ]] || { echo "ERROR: missing dev env file: $ENV_FILE" >&2; exit 5; }
[[ "$(stat -c %a "$ENV_FILE")" == "600" ]] || { echo "ERROR: dev env file must be mode 600" >&2; exit 6; }

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY_RUN_OK branch=$branch sha=$local_sha lock=$LOCK_FILE"
  exit 0
fi

tmp_env="$PROJECT_DIR/.env.development.local"
backup_env=""
if [[ -e "$tmp_env" || -L "$tmp_env" ]]; then
  backup_env="$(mktemp)"
  cp -a "$tmp_env" "$backup_env"
  rm -f "$tmp_env"
fi
ln -s "$ENV_FILE" "$tmp_env"
cleanup() {
  rm -f "$tmp_env"
  if [[ -n "$backup_env" ]]; then
    cp -a "$backup_env" "$tmp_env"
    rm -f "$backup_env"
  fi
}
trap cleanup EXIT

old_prod=$(docker inspect cubicle-cubicle-1 --format '{{.Image}}|{{.State.StartedAt}}' 2>/dev/null || true)
build_date=$(date -u +%Y-%m-%dT%H:%M:%SZ)
VCS_REF="$local_sha" BUILD_DATE="$build_date" docker compose -p cubicle-dev -f docker-compose.dev.yml build cubicle-dev
image_id=$(docker image inspect cubicle-dev:prod --format '{{.Id}}')
revision=$(docker image inspect cubicle-dev:prod --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
[[ "$revision" == "$local_sha" ]] || { echo "ERROR: built image revision mismatch" >&2; exit 8; }

docker rm -f cubicle-dev >/dev/null 2>&1 || true
docker compose -p cubicle-dev -f docker-compose.dev.yml create --no-build cubicle-dev
docker compose -p cubicle-dev -f docker-compose.dev.yml start cubicle-dev

state=""
for _ in $(seq 1 "$WAIT_SECONDS"); do
  state=$(docker inspect cubicle-dev --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)
  [[ "$state" == "healthy" ]] && break
  [[ "$state" == "unhealthy" ]] && { echo "ERROR: cubicle-dev unhealthy" >&2; exit 9; }
  sleep 1
done
[[ "$state" == "healthy" ]] || { echo "ERROR: cubicle-dev health timeout" >&2; exit 10; }

health=$(docker exec cubicle-dev wget -qO- http://127.0.0.1:3100/api/health)
grep -q '"status":"ok"' <<<"$health"
grep -q '"db":"ok"' <<<"$health"
new_prod=$(docker inspect cubicle-cubicle-1 --format '{{.Image}}|{{.State.StartedAt}}' 2>/dev/null || true)
[[ "$new_prod" == "$old_prod" ]] || { echo "ERROR: production container changed during dev deploy" >&2; exit 11; }

printf 'DEV_DEPLOY_OK\nbranch=%s\nsource_sha=%s\nimage_id=%s\nhealth=%s\nproduction_unchanged=true\n' \
  "$branch" "$local_sha" "$image_id" "$health"
