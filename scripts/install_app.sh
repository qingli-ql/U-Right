#!/bin/zsh
set -euo pipefail

CONFIG="${1:-Release}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="$ROOT/build/xcode/$CONFIG/U-Right.app"
INSTALL_PATH="${APP_INSTALL_PATH:-/Applications/U-Right.app}"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/Current/Frameworks/LaunchServices.framework/Versions/Current/Support/lsregister"
PLUGINKIT="/usr/bin/pluginkit"
DITTO="/usr/bin/ditto"
EXT_ID="com.openai.uright.findersync"
BUILD_PLUGIN_PATH="$APP_PATH/Contents/PlugIns/U-Right Finder Sync.appex"
INSTALL_PLUGIN_PATH="$INSTALL_PATH/Contents/PlugIns/U-Right Finder Sync.appex"
TMP_INSTALL_PATH="${INSTALL_PATH}.tmp.$$"

if [[ ! -d "$APP_PATH" ]]; then
  "$ROOT/scripts/build_app.sh" "$CONFIG"
fi

remove_registered_copy() {
  local path="$1"
  if [[ -n "$path" && -d "$path" ]]; then
    "$PLUGINKIT" -r "$path" >/dev/null 2>&1 || true
  fi
}

if [[ -d "$INSTALL_PLUGIN_PATH" ]]; then
  remove_registered_copy "$INSTALL_PLUGIN_PATH"
fi

CURRENT_PATH="$("$PLUGINKIT" -m -D -i "$EXT_ID" -vv 2>/dev/null | sed -n 's/^[[:space:]]*Path = //p' | head -n 1)"
remove_registered_copy "$CURRENT_PATH"

if pgrep -f "$INSTALL_PATH/Contents/MacOS/U-Right" >/dev/null 2>&1; then
  pkill -f "$INSTALL_PATH/Contents/MacOS/U-Right" || true
fi
if pgrep -f "$INSTALL_PLUGIN_PATH/Contents/MacOS/U-Right Finder Sync" >/dev/null 2>&1; then
  pkill -f "$INSTALL_PLUGIN_PATH/Contents/MacOS/U-Right Finder Sync" || true
fi

"$LSREGISTER" -u "$INSTALL_PATH" >/dev/null 2>&1 || true
rm -rf "$TMP_INSTALL_PATH"
"$DITTO" "$APP_PATH" "$TMP_INSTALL_PATH"
rm -rf "$INSTALL_PATH"
mv "$TMP_INSTALL_PATH" "$INSTALL_PATH"

if [[ -d "$BUILD_PLUGIN_PATH" ]]; then
  remove_registered_copy "$BUILD_PLUGIN_PATH"
fi
if [[ -d "$INSTALL_PLUGIN_PATH" ]]; then
  "$PLUGINKIT" -a "$INSTALL_PLUGIN_PATH" >/dev/null 2>&1 || true
fi
"$LSREGISTER" -f -R "$INSTALL_PATH" >/dev/null 2>&1 || true

echo "Installed to $INSTALL_PATH"
