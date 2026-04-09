#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ -n "${APP_GROUP_IDENTIFIER:-}" ]]; then
  printf '%s\n' "$APP_GROUP_IDENTIFIER"
  exit 0
fi

TEAM_ID="${DEVELOPMENT_TEAM:-}"
if [[ -z "$TEAM_ID" ]]; then
  TEAM_ID="$("$ROOT/tools/doctor/detect-team.sh")"
fi

if [[ -n "$TEAM_ID" ]]; then
  printf '%s.uright.shared\n' "$TEAM_ID"
  exit 0
fi

if [[ -n "${URIGHT_ALLOW_LEGACY_APP_GROUP:-}" ]]; then
  printf '%s\n' "group.com.openai.uright"
  exit 0
fi

echo "Unable to resolve DEVELOPMENT_TEAM for app group identifier."
echo "Set DEVELOPMENT_TEAM or APP_GROUP_IDENTIFIER explicitly."
exit 1
