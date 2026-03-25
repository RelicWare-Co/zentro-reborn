#!/usr/bin/env bash

set -euo pipefail

push_image=false

for arg in "$@"; do
	case "$arg" in
		--push)
			push_image=true
			;;
		*)
			echo "Unknown argument: $arg" >&2
			echo "Usage: $0 [--push]" >&2
			exit 1
			;;
	esac
done

platform="${PLATFORM:-linux/amd64}"
local_image_name="${LOCAL_IMAGE_NAME:-zentro-reborn}"
image_name="${IMAGE_NAME:-ghcr.io/relicware-co/zentro-reborn}"

build_timestamp="${APP_BUILD_TIMESTAMP:-$(( $(date -u +%s) * 1000 ))}"

resolve_git_ref() {
	if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
		return 1
	fi

	git rev-parse --short=12 HEAD 2>/dev/null
}

is_git_dirty() {
	if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
		return 1
	fi

	[[ -n "$(git status --porcelain 2>/dev/null)" ]]
}

git_ref="$(resolve_git_ref || true)"
release_id="${APP_RELEASE_ID:-${RELEASE_ID:-${GITHUB_SHA:-${CI_COMMIT_SHA:-${CI_COMMIT_SHORT_SHA:-${RENDER_GIT_COMMIT:-${VERCEL_GIT_COMMIT_SHA:-${CF_PAGES_COMMIT_SHA:-${COMMIT_SHA:-${SOURCE_VERSION:-}}}}}}}}}}"

if [[ -z "$release_id" ]]; then
	if [[ -n "$git_ref" ]]; then
		release_id="$git_ref"
	else
		release_id="$build_timestamp"
	fi
fi

if is_git_dirty; then
	release_id="${release_id}-dirty-${build_timestamp}"
fi

release_tag="$(printf '%s' "$release_id" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9._-]/-/g')"

if [[ -z "$release_tag" ]]; then
	echo "Could not derive a valid release tag from APP_RELEASE_ID=$release_id" >&2
	exit 1
fi

local_latest_tag="${local_image_name}:latest"
remote_latest_tag="${image_name}:latest"
remote_release_tag="${image_name}:${release_tag}"

echo "Building release"
echo "  release_id: $release_id"
echo "  build_timestamp: $build_timestamp"
echo "  platform: $platform"
echo "  local_tag: $local_latest_tag"
echo "  remote_latest_tag: $remote_latest_tag"
echo "  remote_release_tag: $remote_release_tag"

docker build \
	--platform "$platform" \
	--build-arg "APP_RELEASE_ID=$release_id" \
	--build-arg "APP_BUILD_TIMESTAMP=$build_timestamp" \
	-t "$local_latest_tag" \
	-t "$remote_latest_tag" \
	-t "$remote_release_tag" \
	.

if [[ "$push_image" == "true" ]]; then
	docker push "$remote_latest_tag"
	docker push "$remote_release_tag"
fi
