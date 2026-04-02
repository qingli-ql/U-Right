#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/scripts/app_group_id.sh")}"
APP_GROUP_PATH="$HOME/Library/Group Containers/$APP_GROUP_IDENTIFIER/uright.log"
APP_SUPPORT_PATH="$HOME/Library/Application Support/U-Right/uright.log"

if [[ -e "$APP_GROUP_PATH" || -d "${APP_GROUP_PATH:h}" ]]; then
  printf '%s\n' "$APP_GROUP_PATH"
else
  printf '%s\n' "$APP_SUPPORT_PATH"
fi
