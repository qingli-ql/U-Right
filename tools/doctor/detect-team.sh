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

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
IDENTITY_SHA="$("$ROOT/tools/doctor/detect-codesign-identity.sh")"
if [[ -n "$IDENTITY_SHA" ]]; then
  TEAM_ID="$(
    security find-certificate -Z -a -p "${HOME}/Library/Keychains/login.keychain-db" 2>/dev/null \
    | awk -v sha="$IDENTITY_SHA" 'BEGIN{capture=0} /^SHA-1 hash:/ {capture = ($3 == sha)} capture {print}' \
    | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' \
    | openssl x509 -noout -subject -nameopt RFC2253 2>/dev/null \
    | sed -n 's/.*OU=\([A-Z0-9]\{10\}\).*/\1/p'
  )"
  if [[ -n "$TEAM_ID" ]]; then
    echo "$TEAM_ID"
    exit 0
  fi
fi

TEAM_ID="$(
  security find-identity -v -p codesigning 2>/dev/null \
  | sed -n 's/.*Apple Development: .* (\([A-Z0-9]\{10\}\)).*/\1/p' \
  | head -n 1
)"

if [[ -n "$TEAM_ID" ]]; then
  echo "$TEAM_ID"
fi
