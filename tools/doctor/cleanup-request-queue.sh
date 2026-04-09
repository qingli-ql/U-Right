#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/tools/doctor/app-group-id.sh")}"
REQUESTS_ROOT="$HOME/Library/Group Containers/$APP_GROUP_IDENTIFIER/Requests"

incoming_dir="$REQUESTS_ROOT/incoming"
processing_dir="$REQUESTS_ROOT/processing"

mkdir -p "$incoming_dir" "$processing_dir"

incoming_before=$(find "$incoming_dir" -maxdepth 1 -type f -name '*.json' | wc -l | tr -d ' ')
processing_before=$(find "$processing_dir" -maxdepth 1 -type f -name '*.json' | wc -l | tr -d ' ')

find "$incoming_dir" -maxdepth 1 -type f -name '*.json' -delete
find "$processing_dir" -maxdepth 1 -type f -name '*.json' -delete

printf 'Cleaned request queue appGroup=%s incoming=%s processing=%s root=%s\n' \
  "$APP_GROUP_IDENTIFIER" \
  "$incoming_before" \
  "$processing_before" \
  "$REQUESTS_ROOT"
