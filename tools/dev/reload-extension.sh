#!/bin/zsh
set -euo pipefail

APP_PATH="${1:-/Applications/U-Right.app}"
EXT_ID="com.openai.uright.findersync"
APPEX_PATH="$APP_PATH/Contents/PlugIns/U-Right Finder Sync.appex"
APP_INFO_PLIST="$APP_PATH/Contents/Info.plist"
EXT_INFO_PLIST="$APPEX_PATH/Contents/Info.plist"
PLUGINKIT="/usr/bin/pluginkit"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/Current/Frameworks/LaunchServices.framework/Versions/Current/Support/lsregister"
PLIST_BUDDY="/usr/libexec/PlistBuddy"
OPEN_APP_AFTER_RELOAD="${OPEN_APP_AFTER_RELOAD:-0}"
CONFIG="${CONFIG:-Debug}"

remove_registered_copy() {
  local path="$1"
  if [[ -n "$path" && -d "$path" ]]; then
    "$PLUGINKIT" -r "$path" || true
  fi
}

die() {
  echo "$1" >&2
  exit 1
}

read_plist_value() {
  local plist="$1"
  local key="$2"
  [[ -f "$plist" ]] || return 1
  "$PLIST_BUDDY" -c "Print :$key" "$plist" 2>/dev/null
}

verify_runtime_truth() {
  [[ -d "$APP_PATH" ]] || die "App not found: $APP_PATH"
  [[ -f "$APP_INFO_PLIST" ]] || die "Host Info.plist not found: $APP_INFO_PLIST"
  [[ -d "$APPEX_PATH" ]] || die "Extension not found: $APPEX_PATH"
  [[ -f "$EXT_INFO_PLIST" ]] || die "Extension Info.plist not found: $EXT_INFO_PLIST"

  local app_runtime
  local extension_expected_runtime

  app_runtime="$(read_plist_value "$APP_INFO_PLIST" "URightHostRuntime" || true)"
  extension_expected_runtime="$(read_plist_value "$EXT_INFO_PLIST" "URightExpectedHostRuntime" || true)"

  [[ "$app_runtime" == "electron" ]] || die "Host runtime truth failed: expected $APP_INFO_PLIST URightHostRuntime=electron, got '${app_runtime:-<missing>}'"
  [[ "$extension_expected_runtime" == "electron" ]] || die "Extension expectation failed: expected $EXT_INFO_PLIST URightExpectedHostRuntime=electron, got '${extension_expected_runtime:-<missing>}'"

  echo "Host identity verified"
  echo "  app_path=$APP_PATH"
  echo "  host_runtime=$app_runtime"
  echo "  extension_expected_runtime=$extension_expected_runtime"
  echo "  appex_path=$APPEX_PATH"
}

verify_runtime_truth

CURRENT_PATH="$("$PLUGINKIT" -m -D -i "$EXT_ID" -vv 2>/dev/null | sed -n 's/^[[:space:]]*Path = //p' | head -n 1)"
if [[ -n "$CURRENT_PATH" ]]; then
  echo "Removing registered extension: $CURRENT_PATH"
  remove_registered_copy "$CURRENT_PATH"
fi

remove_registered_copy "$APPEX_PATH"

"$LSREGISTER" -f -R -trusted "$APP_PATH" >/dev/null 2>&1

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
  "$PLUGINKIT" -a "$APPEX_PATH"
else
  die "Built extension not found at $APPEX_PATH"
fi
if ! wait_for_path; then
  die "Finder Sync did not re-register at $APPEX_PATH"
fi
"$PLUGINKIT" -e use -i "$EXT_ID"
if ! wait_for_enabled; then
  die "Finder Sync registration did not converge to an enabled state at $APPEX_PATH"
fi
killall Finder || true
if [[ "$OPEN_APP_AFTER_RELOAD" == "1" ]]; then
  open "$APP_PATH"
fi

echo "Reloaded Finder"
if [[ "$OPEN_APP_AFTER_RELOAD" == "1" ]]; then
  echo "Reopened $APP_PATH"
fi
verify_runtime_truth
"$PLUGINKIT" -m -A -D -i "$EXT_ID" -vv | sed -n '1,40p'
