#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="${1:-Debug}"
APP_PATH="${APP_INSTALL_PATH:-/Applications/U-Right.app}"

"$ROOT/scripts/install_app.sh" "$CONFIG"

open "$APP_PATH"
