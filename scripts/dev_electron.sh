#!/bin/zsh
set -euo pipefail

CONFIG="${1:-Debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="${APP_INSTALL_PATH:-/Applications/U-Right.app}"

DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-$("$ROOT/scripts/detect_team.sh")}"
export DEVELOPMENT_TEAM
export ALLOW_PROVISIONING_UPDATES="${ALLOW_PROVISIONING_UPDATES:-1}"

cleanup_existing_dev_processes() {
  local pattern
  for pattern in \
    "vite --config electron/vite.config.ts --host 127.0.0.1 --port 5187 --strictPort" \
    "tsc -p electron/tsconfig.node.json --watch --preserveWatchOutput" \
    "electron electron/dist/main/main/index.js" \
    "wait-on electron/dist/main/main/index.js http-get://127.0.0.1:5187"
  do
    if pgrep -f "$pattern" >/dev/null 2>&1; then
      pkill -f "$pattern" || true
    fi
  done

  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:5187 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill >/dev/null 2>&1 || true
    fi
  fi
}

cleanup_existing_dev_processes

"$ROOT/scripts/install_app.sh" "$CONFIG"
OPEN_APP_AFTER_RELOAD=0 "$ROOT/scripts/reload_extension.sh" "$APP_PATH"

if pgrep -f "$APP_PATH/Contents/MacOS/U-Right" >/dev/null 2>&1; then
  pkill -f "$APP_PATH/Contents/MacOS/U-Right" || true
fi

cd "$ROOT"
exec npm run electron:dev
