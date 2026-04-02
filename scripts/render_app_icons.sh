#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_DIR="$ROOT/Resources/App/Assets.xcassets/AppIcon.appiconset"
SOURCE_SVG="$ICON_DIR/brand-source.svg"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$SOURCE_SVG" ]]; then
  echo "Missing icon source: $SOURCE_SVG" >&2
  exit 1
fi

qlmanage -t -s 1024 -o "$TMP_DIR" "$SOURCE_SVG" >/dev/null 2>&1
MASTER_PNG="$TMP_DIR/brand-source.svg.png"

if [[ ! -f "$MASTER_PNG" ]]; then
  echo "Failed to rasterize icon source: $SOURCE_SVG" >&2
  exit 1
fi

render_one() {
  local output_name="$1"
  local size="$2"
  sips -z "$size" "$size" "$MASTER_PNG" --out "$ICON_DIR/$output_name" >/dev/null
  echo "Rendered $output_name (${size}x${size})"
}

render_one "icon_16x16.png" 16
render_one "icon_16x16@2x.png" 32
render_one "icon_32x32.png" 32
render_one "icon_32x32@2x.png" 64
render_one "icon_128x128.png" 128
render_one "icon_128x128@2x.png" 256
render_one "icon_256x256.png" 256
render_one "icon_256x256@2x.png" 512
cp "$MASTER_PNG" "$ICON_DIR/icon_512x512@2x.png"
sips -z 512 512 "$MASTER_PNG" --out "$ICON_DIR/icon_512x512.png" >/dev/null
echo "Rendered icon_512x512.png (512x512)"
echo "Rendered icon_512x512@2x.png (1024x1024)"
