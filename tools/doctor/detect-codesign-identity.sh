#!/bin/zsh
set -euo pipefail

if [[ -n "${CODESIGN_IDENTITY_SHA:-}" ]]; then
  printf '%s\n' "$CODESIGN_IDENTITY_SHA"
  exit 0
fi

if [[ -f "${HOME}/.config/uright/dev.env" ]]; then
  # shellcheck disable=SC1090
  source "${HOME}/.config/uright/dev.env"
fi

if [[ -n "${CODESIGN_IDENTITY_SHA:-}" ]]; then
  printf '%s\n' "$CODESIGN_IDENTITY_SHA"
  exit 0
fi

IDENTITY_SHA="$(
  security find-identity -v -p codesigning 2>/dev/null \
  | sed -n 's/ *[0-9]) \([A-F0-9]\{40\}\) "Apple Development: .*"/\1/p' \
  | head -n 1
)"

if [[ -n "$IDENTITY_SHA" ]]; then
  printf '%s\n' "$IDENTITY_SHA"
fi
