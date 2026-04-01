#!/bin/zsh
set -euo pipefail

APP_PATH="${1:-/Applications/U-Right.app}"
EXT_ID="com.openai.uright.findersync"
APPEX_PATH="$APP_PATH/Contents/PlugIns/U-Right Finder Sync.appex"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGINKIT="/usr/bin/pluginkit"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/Current/Frameworks/LaunchServices.framework/Versions/Current/Support/lsregister"
OPEN_APP_AFTER_RELOAD="${OPEN_APP_AFTER_RELOAD:-1}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "App not found: $APP_PATH" >&2
  exit 1
fi

remove_registered_copy() {
  local path="$1"
  if [[ -n "$path" && -d "$path" ]]; then
    "$PLUGINKIT" -r "$path" || true
  fi
}

CURRENT_PATH="$("$PLUGINKIT" -m -D -i "$EXT_ID" -vv 2>/dev/null | sed -n 's/^[[:space:]]*Path = //p' | head -n 1)"
if [[ -n "$CURRENT_PATH" ]]; then
  echo "Removing registered extension: $CURRENT_PATH"
  remove_registered_copy "$CURRENT_PATH"
fi

remove_registered_copy "$APPEX_PATH"
remove_registered_copy "$ROOT/build/DerivedData/Build/Products/Debug/U-Right.app/Contents/PlugIns/U-Right Finder Sync.appex"
remove_registered_copy "$ROOT/build/xcode/Debug/U-Right.app/Contents/PlugIns/U-Right Finder Sync.appex"

"$LSREGISTER" -f -R -trusted "$APP_PATH" >/dev/null 2>&1 || true

wait_for_path() {
  local attempts=0
  while [[ $attempts -lt 20 ]]; do
    local output
    output="$("$PLUGINKIT" -m -A -D -i "$EXT_ID" -vv 2>/dev/null || true)"
    if [[ "$output" == *"Path = $APPEX_PATH"* ]]; then
      return 0
    fi
    sleep 0.5
    attempts=$((attempts + 1))
  done
  return 1
}

wait_for_enabled() {
  local attempts=0
  while [[ $attempts -lt 20 ]]; do
    local output
    output="$("$PLUGINKIT" -m -A -D -i "$EXT_ID" -vv 2>/dev/null || true)"
    if [[ "$output" == +* && "$output" == *"Path = $APPEX_PATH"* ]]; then
      return 0
    fi
    sleep 0.5
    attempts=$((attempts + 1))
  done
  return 1
}

if [[ -d "$APPEX_PATH" ]]; then
  "$PLUGINKIT" -a "$APPEX_PATH" || true
fi
if ! wait_for_path; then
  echo "Warning: Finder Sync did not re-register at $APPEX_PATH" >&2
fi
"$PLUGINKIT" -e use -i "$EXT_ID" || true
if ! wait_for_enabled; then
  echo "Warning: Finder Sync registration did not converge to an enabled state at $APPEX_PATH" >&2
fi
killall Finder || true
if [[ "$OPEN_APP_AFTER_RELOAD" == "1" ]]; then
  open "$APP_PATH"
fi

echo "Reloaded Finder"
if [[ "$OPEN_APP_AFTER_RELOAD" == "1" ]]; then
  echo "Reopened $APP_PATH"
fi
"$PLUGINKIT" -m -A -D -i "$EXT_ID" -vv | sed -n '1,40p'
