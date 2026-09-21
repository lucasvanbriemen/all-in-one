#!/bin/bash
#
# Builds a Release version of All in one and installs it in /Applications.
#
#   npm run macos:release
#
# Signed with whatever Xcode picks for the target (an Apple Development
# certificate is fine), so the app runs on this Mac without the packager.
# For a notarised .dmg to send to other Macs use scripts/release-macos.sh.
set -euo pipefail

cd "$(dirname "$0")/.."

BUILD_DIR="macos/build/release"
APP="$BUILD_DIR/Build/Products/Release/AllInOne.app"
DEST="/Applications/AllInOne.app"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

say "Building Release"
xcodebuild \
  -workspace macos/AllInOne.xcworkspace \
  -scheme AllInOne-macOS \
  -configuration Release \
  -derivedDataPath "$BUILD_DIR" \
  -destination 'platform=macOS' \
  -allowProvisioningUpdates \
  build | grep -E '^[^ ].*error:|^\*\* BUILD' || true

[ -d "$APP" ] || { echo "error: no app at $APP" >&2; exit 1; }

say "Installing to $DEST"
osascript -e 'quit app "AllInOne"' 2>/dev/null || true
rm -rf "$DEST"
cp -R "$APP" "$DEST"

say "Launching"
open "$DEST"
