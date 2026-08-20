#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR=${PROJECT_DIR:-/root/projects/cubicle}
RELEASE_DIR=${RELEASE_DIR:-/root/releases/cubiqlo}
IMAGE_REPO=${IMAGE_REPO:-cubicle}
NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-https://app.cubiqlo.com}
SKIP_QUALITY_GATE=${SKIP_QUALITY_GATE:-0}

cd "$PROJECT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is not clean" >&2
  exit 1
fi

branch=$(git branch --show-current)
if [[ -z "$branch" ]]; then
  echo "ERROR: detached HEAD is not allowed" >&2
  exit 1
fi

git fetch origin "$branch" --quiet
local_sha=$(git rev-parse HEAD)
remote_sha=$(git rev-parse "origin/$branch")
if [[ "$local_sha" != "$remote_sha" ]]; then
  echo "ERROR: local HEAD does not match origin/$branch" >&2
  exit 1
fi

short_sha=${local_sha:0:12}
tag="${IMAGE_REPO}:sha-${local_sha}"
built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [[ "$SKIP_QUALITY_GATE" != "1" ]]; then
  npm ci --legacy-peer-deps --ignore-scripts
  npm run lint
  npx tsc --noEmit
  npm test
  npm run build
  npm audit --audit-level=critical
fi

DOCKER_BUILDKIT=1 docker build \
  --build-arg "NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL" \
  --build-arg "VCS_REF=$local_sha" \
  --build-arg "BUILD_DATE=$built_at" \
  --label "com.cubiqlo.release.channel=vps-local" \
  --tag "$tag" \
  .

image_id=$(docker image inspect "$tag" --format '{{.Id}}')
config_revision=$(docker image inspect "$tag" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
config_created=$(docker image inspect "$tag" --format '{{index .Config.Labels "org.opencontainers.image.created"}}')

if [[ "$config_revision" != "$local_sha" || "$config_created" != "$built_at" ]]; then
  echo "ERROR: built image metadata does not match release source" >&2
  exit 1
fi

mkdir -p "$RELEASE_DIR"
manifest="$RELEASE_DIR/${built_at//:/-}-${short_sha}.env"
tmp=$(mktemp "$RELEASE_DIR/.release.XXXXXX")
{
  printf 'RELEASE_VERSION=1\n'
  printf 'SOURCE_BRANCH=%q\n' "$branch"
  printf 'SOURCE_SHA=%q\n' "$local_sha"
  printf 'IMAGE_TAG=%q\n' "$tag"
  printf 'IMAGE_ID=%q\n' "$image_id"
  printf 'BUILT_AT=%q\n' "$built_at"
  printf 'NEXT_PUBLIC_APP_URL=%q\n' "$NEXT_PUBLIC_APP_URL"
  printf 'QUALITY_GATE=%q\n' "$([[ "$SKIP_QUALITY_GATE" == "1" ]] && echo skipped || echo passed)"
} > "$tmp"
chmod 600 "$tmp"
mv "$tmp" "$manifest"
ln -sfn "$(basename "$manifest")" "$RELEASE_DIR/current.env"

printf 'RELEASE_OK\nmanifest=%s\nimage_tag=%s\nimage_id=%s\nsource_sha=%s\n' \
  "$manifest" "$tag" "$image_id" "$local_sha"
