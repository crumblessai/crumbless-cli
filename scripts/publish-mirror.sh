#!/usr/bin/env bash
# Publishes cli/ to the public distribution repo, crumblessai/crumbless-cli.
#
# Why a mirror and not a second source of truth: the CLI, the API endpoints it
# calls and the MCP tools change in the SAME pull request, in this repo. Splitting
# the CLI into its own repo would put a review boundary in the middle of one
# change. So this repo stays where you edit, and the public repo is what a user
# clones, curls and downloads releases from.
#
# The public repo carries the CLI at its ROOT (`scripts/install.sh`, not
# `cli/scripts/install.sh`) because that is what every published URL says and what
# a standalone CLI repo is expected to look like. `git subtree split` does exactly
# that rewrite, keeping the commits that touched cli/ and their authorship.
#
#   bash cli/scripts/publish-mirror.sh            # dry run: builds, shows, pushes nothing
#   bash cli/scripts/publish-mirror.sh --push     # actually pushes
set -euo pipefail

readonly MIRROR_REMOTE="https://github.com/crumblessai/crumbless-cli.git"
readonly SPLIT_BRANCH="cli-publish"
readonly PREFIX="cli"

cd "$(git rev-parse --show-toplevel)"

# Un mirror preso da un albero sporco pubblica un lavoro a metà, e il repo pubblico
# non ha modo di dire che lo è.
if ! git diff --quiet -- "$PREFIX" || ! git diff --cached --quiet -- "$PREFIX"; then
  echo "error: uncommitted changes under $PREFIX/ - commit them first" >&2
  exit 1
fi

git branch -D "$SPLIT_BRANCH" 2>/dev/null || true
git subtree split --prefix="$PREFIX" -b "$SPLIT_BRANCH" >/dev/null

# `.claude-plugin/marketplace.json` vive alla radice del monorepo, fuori da cli/,
# quindi lo split non lo porta con sé - ma `/plugin marketplace add crumblessai/
# crumbless-cli` lo cerca proprio lì. Si rigenera con il path adattato alla radice.
work="$(mktemp -d)"
cleanup() { command rm -rf -- "$work"; }
trap cleanup EXIT

git clone --quiet --branch "$SPLIT_BRANCH" --single-branch . "$work/mirror"
mkdir -p "$work/mirror/.claude-plugin"
sed 's|"./cli/plugins/crumbless"|"./plugins/crumbless"|' \
  .claude-plugin/marketplace.json > "$work/mirror/.claude-plugin/marketplace.json"

cd "$work/mirror"
git add .claude-plugin/marketplace.json
if ! git diff --cached --quiet; then
  git -c user.name="psumo" -c user.email="tanerhassan23@hotmail.co.uk" \
    commit --quiet -m "chore: marketplace manifest for the root layout"
fi

echo "mirror built at $(git rev-parse --short HEAD), $(git rev-list --count HEAD) commits"
git ls-tree --name-only HEAD | sed 's/^/  /'

if [[ "${1:-}" != "--push" ]]; then
  echo
  echo "dry run - re-run with --push to publish to $MIRROR_REMOTE"
  exit 0
fi

git push --force "$MIRROR_REMOTE" HEAD:main
echo "pushed to $MIRROR_REMOTE (main)"
