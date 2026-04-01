#!/bin/zsh
set -euo pipefail

if [[ -n "${DEVELOPMENT_TEAM:-}" ]]; then
  echo "$DEVELOPMENT_TEAM"
  exit 0
fi

if [[ -f "${HOME}/.config/uright/dev.env" ]]; then
  # shellcheck disable=SC1090
  source "${HOME}/.config/uright/dev.env"
fi

if [[ -n "${DEVELOPMENT_TEAM:-}" ]]; then
  echo "$DEVELOPMENT_TEAM"
  exit 0
fi

TEAM_ID="$(
  security find-identity -v -p codesigning 2>/dev/null \
  | sed -n 's/.*Apple Development: .* (\([A-Z0-9]\{10\}\)).*/\1/p' \
  | head -n 1
)"

if [[ -n "$TEAM_ID" ]]; then
  echo "$TEAM_ID"
fi
