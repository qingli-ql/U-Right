#!/bin/zsh
set -euo pipefail

CONFIG="${1:-debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$(cd "$ROOT" && swift build -c "$CONFIG" --show-bin-path)"
APP_DIR="$ROOT/build/${CONFIG}/U-Right.app"
EXT_DIR="$APP_DIR/Contents/PlugIns/URightFinderExtension.appex"

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources" "$EXT_DIR/Contents/MacOS"

cp "$BIN_DIR/URightHost" "$APP_DIR/Contents/MacOS/URightHost"
cp "$ROOT/Resources/App/Info.plist" "$APP_DIR/Contents/Info.plist"

cp "$BIN_DIR/libURightFinderExtensionCore.dylib" "$EXT_DIR/Contents/MacOS/URightFinderExtension"
cp "$ROOT/Resources/Extension/Info.plist" "$EXT_DIR/Contents/Info.plist"
chmod +x "$APP_DIR/Contents/MacOS/URightHost" "$EXT_DIR/Contents/MacOS/URightFinderExtension"

codesign --force --sign - "$EXT_DIR/Contents/MacOS/URightFinderExtension"
codesign --force --sign - --entitlements "$ROOT/Resources/Extension/URightFinderExtension.entitlements" "$EXT_DIR"
codesign --force --sign - "$APP_DIR/Contents/MacOS/URightHost"
codesign --force --deep --sign - --entitlements "$ROOT/Resources/App/URightHost.entitlements" "$APP_DIR"

echo "Built: $APP_DIR"
