#!/bin/zsh
set -euo pipefail

CONFIG="${1:-Debug}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_PATH="${APP_INSTALL_PATH:-/Applications/U-Right.app}"
DEV_RENDERER_URL="${DEV_RENDERER_URL:-http://127.0.0.1:5187}"
RUN_MODE="${URIGHT_RUN_MODE:-dev}"

DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-$("$ROOT/tools/doctor/detect-team.sh")}"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/tools/doctor/app-group-id.sh")}"
SHARED_ROOT="$HOME/Library/Group Containers/$APP_GROUP_IDENTIFIER"
DEV_MANIFEST_PATH="${URIGHT_DEV_MANIFEST_PATH:-$SHARED_ROOT/dev-manifest.json}"
DEV_HOST_STATE_PATH="$SHARED_ROOT/dev-host-state.json"
WAIT_ON_BIN="$ROOT/node_modules/.bin/wait-on"
export DEVELOPMENT_TEAM
export APP_GROUP_IDENTIFIER
export ALLOW_PROVISIONING_UPDATES="${ALLOW_PROVISIONING_UPDATES:-1}"

VITE_PID=""

verify_electron_app_bundle() {
  local bundle_path="$1"
  local require_extension="${2:-0}"
  local info_plist="$bundle_path/Contents/Info.plist"
  local executable_path="$bundle_path/Contents/MacOS/U-Right"
  local framework_path="$bundle_path/Contents/Frameworks/Electron Framework.framework"
  local framework_binary="$framework_path/Electron Framework"
  local resources_path="$bundle_path/Contents/Resources"
  local asar_path="$resources_path/app.asar"
  local unpacked_app_path="$resources_path/app"
  local plug_ins_path="$bundle_path/Contents/PlugIns/U-Right Finder Sync.appex"
  local bundle_identifier=""
  local bundle_executable=""
  local bundle_package_type=""

  if [[ ! -d "$bundle_path" ]]; then
    echo "Electron app bundle missing: $bundle_path" >&2
    exit 1
  fi

  if [[ ! -f "$info_plist" ]]; then
    echo "Electron app Info.plist missing: $info_plist" >&2
    exit 1
  fi

  bundle_identifier="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$info_plist" 2>/dev/null || true)"
  bundle_executable="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$info_plist" 2>/dev/null || true)"
  bundle_package_type="$(/usr/libexec/PlistBuddy -c 'Print :CFBundlePackageType' "$info_plist" 2>/dev/null || true)"

  if [[ "$bundle_identifier" != "com.openai.uright" ]]; then
    echo "Electron bundle identifier mismatch: expected com.openai.uright, got ${bundle_identifier:-<missing>}" >&2
    exit 1
  fi

  if [[ "$bundle_executable" != "U-Right" ]]; then
    echo "Electron bundle executable mismatch: expected U-Right, got ${bundle_executable:-<missing>}" >&2
    exit 1
  fi

  if [[ "$bundle_package_type" != "APPL" ]]; then
    echo "Electron bundle package type mismatch: expected APPL, got ${bundle_package_type:-<missing>}" >&2
    exit 1
  fi

  if [[ ! -x "$executable_path" ]]; then
    echo "Electron executable missing or not executable: $executable_path" >&2
    exit 1
  fi

  if [[ ! -d "$framework_path" || ! -x "$framework_binary" ]]; then
    echo "Electron Framework missing or invalid: $framework_path" >&2
    exit 1
  fi

  if [[ ! -e "$asar_path" && ! -d "$unpacked_app_path" ]]; then
    echo "Electron renderer resources missing: expected app.asar or app under $resources_path" >&2
    exit 1
  fi

  if [[ "$require_extension" == "1" && ! -d "$plug_ins_path" ]]; then
    echo "Finder Sync extension missing from Electron bundle: $plug_ins_path" >&2
    exit 1
  fi
}

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
    "$ROOT/node_modules/.bin/electron electron/dist/main/main/bootstrap/index.js"
    "$ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron electron/dist/main/main/bootstrap/index.js"
    "npm run electron:dev"
    "npm run electron:dev:main"
    "npm run electron:dev:renderer"
    "npm run electron:dev:app"
    "electron/dist/main/main/bootstrap/index.js"
    "electron/dist/main/index.js"
    "vite --config electron/vite.config.ts"
    "tsc -p electron/tsconfig.node.json --watch"
    "wait-on electron/dist/main/main/bootstrap/index.js"
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

write_dev_manifest() {
  cat > "$DEV_MANIFEST_PATH" <<EOF
{
  "enabled": true,
  "rendererURL": "$DEV_RENDERER_URL",
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "source": "tools/dev/run.sh"
}
EOF
}

clear_dev_mode_state() {
  rm -f "$DEV_MANIFEST_PATH" "$DEV_HOST_STATE_PATH" 2>/dev/null || true
}

restart_installed_app() {
  if pgrep -f "$APP_PATH/Contents/MacOS/U-Right" >/dev/null 2>&1; then
    pkill -f "$APP_PATH/Contents/MacOS/U-Right" || true
  fi
  open "$APP_PATH"
}

cleanup() {
  if [[ "$RUN_MODE" == "dev" ]]; then
    clear_dev_mode_state
  fi
  if [[ -n "$VITE_PID" ]] && kill -0 "$VITE_PID" >/dev/null 2>&1; then
    kill "$VITE_PID" >/dev/null 2>&1 || true
    wait "$VITE_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

mkdir -p "$SHARED_ROOT"
clear_dev_mode_state

case "$RUN_MODE" in
  dev)
    cleanup_existing_dev_processes
    write_dev_manifest
    cd "$ROOT"
    npm run electron:dev:renderer &
    VITE_PID=$!

    if [[ ! -x "$WAIT_ON_BIN" ]]; then
      echo "Missing wait-on binary: $WAIT_ON_BIN" >&2
      exit 1
    fi

    "$WAIT_ON_BIN" "http-get://127.0.0.1:5187"
    ;;
  packaged)
    ;;
  *)
    echo "Unsupported URIGHT_RUN_MODE: $RUN_MODE" >&2
    exit 1
    ;;
esac

APP_GROUP_IDENTIFIER="$APP_GROUP_IDENTIFIER" "$ROOT/tools/build/install-app.sh" "$CONFIG"
verify_electron_app_bundle "$APP_PATH" 1
OPEN_APP_AFTER_RELOAD=0 CONFIG="$CONFIG" APP_GROUP_IDENTIFIER="$APP_GROUP_IDENTIFIER" "$ROOT/tools/dev/reload-extension.sh" "$APP_PATH"
restart_installed_app

if [[ "$RUN_MODE" == "dev" ]]; then
  wait "$VITE_PID"
fi
