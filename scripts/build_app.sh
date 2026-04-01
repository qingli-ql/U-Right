#!/bin/zsh
set -euo pipefail

CONFIG="${1:-Debug}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/URight.xcodeproj"
BUILD_ROOT="$ROOT/build/xcode"
DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-$("$ROOT/scripts/detect_team.sh")}"
ALLOW_PROVISIONING_UPDATES="${ALLOW_PROVISIONING_UPDATES:-0}"
FALLBACK_TO_UNSIGNED="${FALLBACK_TO_UNSIGNED:-1}"
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
  SYMROOT="$BUILD_ROOT"
)

run_unsigned_build() {
  echo "Building without signing."
  xcodebuild "${COMMON_ARGS[@]}" CODE_SIGNING_ALLOWED=NO build
}

run_local_signed_build() {
  echo "Building with local ad-hoc signing (Sign to Run Locally)."
  xcodebuild "${COMMON_ARGS[@]}" CODE_SIGN_IDENTITY="-" CODE_SIGNING_ALLOWED=YES CODE_SIGNING_REQUIRED=YES build
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
  if ! xcodebuild "${SIGNED_ARGS[@]}" build; then
    echo "Team-signed build failed."
    if run_local_signed_build; then
      :
    elif [[ "$FALLBACK_TO_UNSIGNED" == "1" ]]; then
      echo "Local signing failed. Falling back to unsigned local build."
      run_unsigned_build
    else
      exit 1
    fi
  fi
else
  if ! run_local_signed_build; then
    if [[ "$FALLBACK_TO_UNSIGNED" == "1" ]]; then
      echo "Local signing failed. Falling back to unsigned local build."
      run_unsigned_build
    else
      exit 1
    fi
  fi
fi

APP_PATH="$BUILD_ROOT/$CONFIG/U-Right.app"
echo "Built: $APP_PATH"
