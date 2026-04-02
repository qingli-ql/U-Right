#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${1:-Debug}"
APP_PATH="${APP_INSTALL_PATH:-/Applications/U-Right.app}"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/scripts/app_group_id.sh")}"

APP_GROUP_IDENTIFIER="$APP_GROUP_IDENTIFIER" "$ROOT/scripts/install_app.sh" "$CONFIG"

open "$APP_PATH"
