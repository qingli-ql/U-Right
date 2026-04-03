#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CURRENT_APP_GROUP="${APP_GROUP_IDENTIFIER:-$("$ROOT/scripts/app_group_id.sh")}"
LEGACY_APP_GROUP="group.com.openai.uright"
LEGACY_ROOT="$HOME/Library/Group Containers/$LEGACY_APP_GROUP"

if [[ "$CURRENT_APP_GROUP" == "$LEGACY_APP_GROUP" ]]; then
  echo "Current app group still points at legacy container: $LEGACY_APP_GROUP"
  exit 1
fi

if [[ ! -d "$LEGACY_ROOT" ]]; then
  echo "Legacy container already absent: $LEGACY_ROOT"
  exit 0
fi

rm -rf "$LEGACY_ROOT"
echo "Removed legacy container: $LEGACY_ROOT"
