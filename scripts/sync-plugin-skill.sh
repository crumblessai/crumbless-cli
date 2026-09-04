#!/usr/bin/env bash
# Keep plugins/crumbless/skills/crumbless in sync with the canonical skills/crumbless tree
# (npx skills / skills.sh). Run after editing the skill.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/skills/crumbless"
DST="$ROOT/plugins/crumbless/skills/crumbless"
if [[ ! -f "$SRC/SKILL.md" ]]; then
  echo "Missing canonical skill at $SRC/SKILL.md" >&2
  exit 1
fi
mkdir -p "$(dirname "$DST")"
rm -rf "$DST"
cp -a "$SRC" "$DST"
echo "Synced $SRC → $DST"
