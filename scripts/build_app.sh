#!/bin/zsh
set -euo pipefail

CONFIG="${1:-Debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/URight.xcodeproj"
BUILD_ROOT="$ROOT/build/xcode"
DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-$("$ROOT/scripts/detect_team.sh")}"
APP_GROUP_IDENTIFIER="${APP_GROUP_IDENTIFIER:-$("$ROOT/scripts/app_group_id.sh")}"
ALLOW_PROVISIONING_UPDATES="${ALLOW_PROVISIONING_UPDATES:-0}"
FALLBACK_TO_UNSIGNED="${FALLBACK_TO_UNSIGNED:-1}"
FALLBACK_TO_LOCAL_SIGN="${FALLBACK_TO_LOCAL_SIGN:-1}"
MANUAL_SIGN_FALLBACK="${MANUAL_SIGN_FALLBACK:-1}"
FORCE_LOCAL_SIGN="${FORCE_LOCAL_SIGN:-0}"
FORCE_UNSIGNED="${FORCE_UNSIGNED:-0}"

if [[ ! -d "$PROJECT" ]]; then
  ruby "$ROOT/scripts/generate_xcodeproj.rb"
fi

COMMON_ARGS=(
  -project "$PROJECT" \
  -scheme "URightHostApp" \
  -configuration "$CONFIG" \
  -derivedDataPath "$BUILD_ROOT/DerivedData" \
  -clonedSourcePackagesDirPath "$BUILD_ROOT/SourcePackages" \
  SYMROOT="$BUILD_ROOT" \
  APP_GROUP_IDENTIFIER="$APP_GROUP_IDENTIFIER"
)

run_unsigned_build() {
  echo "Building without signing."
  xcodebuild "${COMMON_ARGS[@]}" CODE_SIGNING_ALLOWED=NO build
}

run_local_signed_build() {
  echo "Building with local ad-hoc signing (Sign to Run Locally)."
  xcodebuild "${COMMON_ARGS[@]}" CODE_SIGN_IDENTITY="-" CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=YES build
}

APP_PATH="$BUILD_ROOT/$CONFIG/U-Right.app"

run_manual_sign_fallback() {
  if [[ "$MANUAL_SIGN_FALLBACK" != "1" ]]; then
    return 1
  fi
  local identity_sha
  identity_sha="$("$ROOT/scripts/detect_codesign_identity.sh")"
  if [[ -z "$identity_sha" ]]; then
    return 1
  fi
  echo "Attempting unsigned build + manual codesign fallback."
  run_unsigned_build
  CODESIGN_IDENTITY_SHA="$identity_sha" APP_GROUP_IDENTIFIER="$APP_GROUP_IDENTIFIER" "$ROOT/scripts/sign_app.sh" "$APP_PATH"
}

if [[ "$FORCE_UNSIGNED" == "1" ]]; then
  run_unsigned_build
elif [[ "$FORCE_LOCAL_SIGN" == "1" ]]; then
  run_local_signed_build
elif [[ -n "$DEVELOPMENT_TEAM" ]]; then
  SIGNED_ARGS=(
    "${COMMON_ARGS[@]}"
    CODE_SIGN_STYLE=Automatic
    DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM"
    CODE_SIGNING_ALLOWED=YES
    CODE_SIGNING_REQUIRED=YES
  )
  if [[ "$ALLOW_PROVISIONING_UPDATES" == "1" ]]; then
    SIGNED_ARGS+=( -allowProvisioningUpdates )
  fi
  echo "Building with development signing for team: $DEVELOPMENT_TEAM"
  echo "Using App Group identifier: $APP_GROUP_IDENTIFIER"
  if ! xcodebuild "${SIGNED_ARGS[@]}" build; then
    echo "Team-signed build failed."
    if run_manual_sign_fallback; then
      :
    elif [[ "$FALLBACK_TO_LOCAL_SIGN" == "1" ]] && run_local_signed_build; then
      :
    elif [[ "$FALLBACK_TO_UNSIGNED" == "1" ]]; then
      echo "Local signing failed. Falling back to unsigned local build."
      run_unsigned_build
    else
      exit 1
    fi
  fi
else
  echo "Using App Group identifier: $APP_GROUP_IDENTIFIER"
  if ! run_local_signed_build; then
    if [[ "$FALLBACK_TO_UNSIGNED" == "1" ]]; then
      echo "Local signing failed. Falling back to unsigned local build."
      run_unsigned_build
    else
      exit 1
    fi
  fi
fi

echo "Built: $APP_PATH"
