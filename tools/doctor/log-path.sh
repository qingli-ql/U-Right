#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/tools/doctor/app-group-id.sh")}"
APP_GROUP_PATH="$HOME/Library/Group Containers/$APP_GROUP_IDENTIFIER/uright.log"

printf '%s\n' "$APP_GROUP_PATH"
