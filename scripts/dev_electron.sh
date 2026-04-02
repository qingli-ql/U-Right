#!/bin/zsh
set -euo pipefail

CONFIG="${1:-Debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="${APP_INSTALL_PATH:-/Applications/U-Right.app}"

DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-$("$ROOT/scripts/detect_team.sh")}"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/scripts/app_group_id.sh")}"
export DEVELOPMENT_TEAM
export APP_GROUP_IDENTIFIER
export URIGHT_DEV_HOST=1
export ALLOW_PROVISIONING_UPDATES="${ALLOW_PROVISIONING_UPDATES:-1}"

kill_pattern_pids() {
  local signal="$1"
  local pattern="$2"
  local pids
  pids="$(pgrep -f "$pattern" 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi
  echo "$pids" | while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    kill "$signal" "$pid" >/dev/null 2>&1 || true
  done
}

kill_matching_processes() {
  local signal="$1"
  shift
  local pattern
  for pattern in "$@"; do
    kill_pattern_pids "$signal" "$pattern"
  done
}

wait_for_port_release() {
  local port="$1"
  local attempts=0
  while [[ $attempts -lt 20 ]]; do
    if ! lsof -ti "tcp:$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
    attempts=$((attempts + 1))
  done
  return 1
}

cleanup_existing_dev_processes() {
  local patterns=(
    "$ROOT/node_modules/.bin/concurrently"
    "$ROOT/node_modules/.bin/vite"
    "$ROOT/node_modules/.bin/tsc -p electron/tsconfig.node.json"
    "$ROOT/node_modules/.bin/wait-on"
    "$ROOT/node_modules/.bin/cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5187"
    "$ROOT/node_modules/.bin/electron electron/dist/main/main/index.js"
    "$ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron electron/dist/main/main/index.js"
    "npm run electron:dev"
    "npm run electron:dev:main"
    "npm run electron:dev:renderer"
    "npm run electron:dev:app"
    "electron/dist/main/main/index.js"
    "electron/dist/main/index.js"
    "vite --config electron/vite.config.ts"
    "tsc -p electron/tsconfig.node.json --watch"
    "wait-on electron/dist/main/main/index.js"
    "wait-on electron/dist/main/index.js"
  )

  kill_matching_processes "-TERM" "${patterns[@]}"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:5187 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "$pids" | xargs kill >/dev/null 2>&1 || true
    fi
  fi
  if ! wait_for_port_release 5187; then
    kill_matching_processes "-KILL" "${patterns[@]}"
    if command -v lsof >/dev/null 2>&1; then
      local stubborn_pids
      stubborn_pids="$(lsof -ti tcp:5187 2>/dev/null || true)"
      if [[ -n "$stubborn_pids" ]]; then
        echo "$stubborn_pids" | xargs kill -9 >/dev/null 2>&1 || true
      fi
    fi
    wait_for_port_release 5187 || {
      echo "Failed to free dev port 5187 before startup." >&2
      exit 1
    }
  fi
}

cleanup_existing_dev_processes
rm -f "$HOME/Library/Group Containers/$APP_GROUP_IDENTIFIER/dev-host-state.json" 2>/dev/null || true

APP_GROUP_IDENTIFIER="$APP_GROUP_IDENTIFIER" "$ROOT/scripts/install_app.sh" "$CONFIG"
OPEN_APP_AFTER_RELOAD=0 APP_GROUP_IDENTIFIER="$APP_GROUP_IDENTIFIER" "$ROOT/scripts/reload_extension.sh" "$APP_PATH"

if pgrep -f "$APP_PATH/Contents/MacOS/U-Right" >/dev/null 2>&1; then
  pkill -f "$APP_PATH/Contents/MacOS/U-Right" || true
fi

cd "$ROOT"
exec npm run electron:dev
