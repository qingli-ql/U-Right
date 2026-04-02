#!/bin/zsh
set -euo pipefail

APP_PATH="${1:-}"
if [[ -z "$APP_PATH" || ! -d "$APP_PATH" ]]; then
  echo "Usage: $0 /path/to/U-Right.app" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDENTITY_SHA="${CODESIGN_IDENTITY_SHA:-$("$ROOT/scripts/detect_codesign_identity.sh")}"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/scripts/app_group_id.sh")}"
HOST_ENT_TEMPLATE="$ROOT/Resources/App/URightHost.entitlements"
EXT_ENT_TEMPLATE="$ROOT/Resources/Extension/URightFinderExtension.entitlements"
APPEX_PATH="$APP_PATH/Contents/PlugIns/U-Right Finder Sync.appex"

if [[ -z "$IDENTITY_SHA" ]]; then
  echo "No Apple Development identity found for manual signing." >&2
  exit 1
fi

if [[ ! -d "$APPEX_PATH" ]]; then
  echo "Finder extension not found: $APPEX_PATH" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
HOST_ENT="$TMP_DIR/host.entitlements"
EXT_ENT="$TMP_DIR/extension.entitlements"

perl -0pe "s/\\$\\(APP_GROUP_IDENTIFIER\\)/$APP_GROUP_IDENTIFIER/g" "$HOST_ENT_TEMPLATE" > "$HOST_ENT"
perl -0pe "s/\\$\\(APP_GROUP_IDENTIFIER\\)/$APP_GROUP_IDENTIFIER/g" "$EXT_ENT_TEMPLATE" > "$EXT_ENT"

echo "Manual signing app with identity: $IDENTITY_SHA"
echo "Using App Group identifier: $APP_GROUP_IDENTIFIER"
codesign --force --sign "$IDENTITY_SHA" --entitlements "$EXT_ENT" --timestamp=none "$APPEX_PATH"
codesign --force --sign "$IDENTITY_SHA" --entitlements "$HOST_ENT" --timestamp=none "$APP_PATH"
