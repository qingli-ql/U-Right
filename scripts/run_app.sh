#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/build/debug/U-Right.app"
if [[ ! -d "$APP_DIR" ]]; then
  "$ROOT/scripts/build_app.sh" debug
fi
open "$APP_DIR"
