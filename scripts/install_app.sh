#!/bin/zsh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DIR="$ROOT/build/release/U-Right.app"
if [[ ! -d "$APP_DIR" ]]; then
  "$ROOT/scripts/build_app.sh" release
fi
rm -rf "/Applications/U-Right.app"
cp -R "$APP_DIR" "/Applications/U-Right.app"
echo "Installed to /Applications/U-Right.app"
