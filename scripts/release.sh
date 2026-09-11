#!/usr/bin/env bash
#
# Cut a PageCow release.
#
#   ./scripts/release.sh patch "fix the thing"
#   ./scripts/release.sh minor
#   ./scripts/release.sh major
#
# Bumps the version, commits, tags and pushes — the tag triggers
# .github/workflows/release.yml, which builds, signs, notarizes and publishes
# the installers for macOS (arm64 + Intel), Windows and Linux. The script then
# watches the workflow and prints the release URL.
#
# Everything must be committed first: the script refuses to run on a dirty tree.
set -euo pipefail

REPO="pagecow/pagecow-browser"
BUMP="${1:-}"
SUMMARY="${2:-}"

case "$BUMP" in
  patch|minor|major) ;;
  *)
    echo "usage: $0 [patch|minor|major] [\"release summary\"]" >&2
    exit 1
    ;;
esac

cd "$(dirname "$0")/.."

echo "==> Checking the working tree"
if [ -n "$(git status --porcelain)" ]; then
  echo "error: the working tree is dirty — commit or stash your changes first" >&2
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  echo "error: on '$BRANCH', releases are cut from 'main'" >&2
  exit 1
fi

git fetch origin main --quiet
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "error: local main is not in sync with origin/main — pull or push first" >&2
  exit 1
fi

echo "==> Checking the release secrets"
SECRETS="$(gh secret list --repo "$REPO" | awk '{print $1}')"
for secret in MAC_CERT_P12 MAC_CERT_PASSWORD APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID; do
  if ! grep -qx "$secret" <<< "$SECRETS"; then
    echo "error: GitHub secret $secret is missing (gh secret set $secret --repo $REPO)" >&2
    exit 1
  fi
done

echo "==> Bumping the version ($BUMP)"
npm version "$BUMP" --no-git-tag-version > /dev/null
VERSION="$(node -p "require('./package.json').version")"
TAG="v${VERSION}"

MESSAGE="Release ${TAG}"
if [ -n "$SUMMARY" ]; then
  MESSAGE="${MESSAGE}: ${SUMMARY}"
fi
MESSAGE="${MESSAGE}

Built with ChatOSS.ai"

echo "==> Committing ${TAG}"
git add package.json package-lock.json
git commit -m "$MESSAGE"

echo "==> Pushing main and ${TAG}"
git push origin main
git tag "$TAG"
git push origin "$TAG"

echo "==> Waiting for the release workflow to appear"
RUN_ID=""
for _ in $(seq 1 40); do
  RUN_ID="$(gh run list --repo "$REPO" --workflow=release.yml --limit 20 \
    --json databaseId,headBranch \
    --jq ".[] | select(.headBranch == \"${TAG}\") | .databaseId" | head -1)"
  [ -n "$RUN_ID" ] && break
  sleep 5
done
if [ -z "$RUN_ID" ]; then
  echo "warning: could not find the workflow run for ${TAG}; check https://github.com/${REPO}/actions" >&2
  exit 0
fi

echo "==> Watching run ${RUN_ID} (build + sign + notarize + publish)"
if gh run watch "$RUN_ID" --repo "$REPO" --exit-status; then
  echo
  echo "Release published: https://github.com/${REPO}/releases/tag/${TAG}"
  echo "Download page (updates within ~10 minutes): https://pagecow.com/download"
else
  echo "error: the release workflow failed — see https://github.com/${REPO}/actions/runs/${RUN_ID}" >&2
  exit 1
fi
