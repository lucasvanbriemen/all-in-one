#!/bin/bash
#
# Builds, signs, notarises and packages All in one for distribution to other Macs.
#
#   scripts/release-macos.sh              # build, sign, notarise, staple, .dmg
#   SKIP_NOTARIZE=1 scripts/release-macos.sh   # local install only
#
# Two things have to exist first, both one-off:
#
#   1. A "Developer ID Application" certificate in the login keychain. Xcode ->
#      Settings -> Accounts -> (your team) -> Manage Certificates -> + ->
#      Developer ID Application. Needs the Account Holder or Admin role.
#
#   2. Notarisation credentials stored under the profile named below:
#      xcrun notarytool store-credentials AIO_NOTARY \
#        --apple-id <your Apple ID> --team-id DGTBJZL464 \
#        --password <an app-specific password from appleid.apple.com>
#
# Xcode's exportArchive is deliberately not used. It re-signs the app bundle but
# not the Mach-O files staged under Contents/Resources, which would leave the
# bundled Node signed with one identity inside an app signed with another —
# notarisation rejects that. Signing every binary here, inside out, keeps the
# whole bundle consistent.
set -euo pipefail

cd "$(dirname "$0")/.."

TEAM_ID="DGTBJZL464"
NOTARY_PROFILE="${NOTARY_PROFILE:-AIO_NOTARY}"
BUILD_DIR="macos/build/release"
APP="$BUILD_DIR/Build/Products/Release/AllInOne.app"
OUT="dist-macos"

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# --- The certificate -------------------------------------------------------
# SIGN_IDENTITY overrides the search — useful for rehearsing the whole pipeline
# with an Apple Development certificate before the Developer ID one exists. Such
# a build runs here and nowhere else; it cannot be notarised.
IDENTITY="${SIGN_IDENTITY:-$(security find-identity -v -p codesigning \
  | grep "Developer ID Application" | head -1 | sed -n 's/.*"\(.*\)"/\1/p')}" || true

if [ -z "${IDENTITY:-}" ]; then
  cat >&2 <<'MSG'
error: no "Developer ID Application" certificate in the keychain.

This is the only certificate that lets an app run on Macs other than the ones
registered to your developer account. An "Apple Development" certificate is not
a substitute — Gatekeeper rejects it everywhere except your own machines.

  Xcode -> Settings -> Accounts -> select your team -> Manage Certificates
        -> + -> Developer ID Application

Then run this script again.
MSG
  exit 1
fi
echo "signing as: $IDENTITY"

# --- Build -----------------------------------------------------------------
say "Building Release"
# Signed by hand below, so Xcode's own signing is turned off here.
xcodebuild \
  -workspace macos/AllInOne.xcworkspace \
  -scheme AllInOne-macOS \
  -configuration Release \
  -derivedDataPath "$BUILD_DIR" \
  -destination 'platform=macOS' \
  CODE_SIGNING_ALLOWED=NO \
  build

[ -d "$APP" ] || { echo "error: no app at $APP" >&2; exit 1; }

# --- Sign ------------------------------------------------------------------
# Code signatures nest: a bundle's signature covers everything inside it, so an
# inner binary signed after its container invalidates the container. Everything
# below is therefore signed leaf-first, with the app itself last.
say "Signing"

sign() {
  local entitlements="$1"; shift
  local args=(--force --timestamp --options runtime --sign "$IDENTITY")
  [ -n "$entitlements" ] && args+=(--entitlements "$entitlements")
  codesign "${args[@]}" "$@"
}

SERVER="$APP/Contents/Resources/server"

# spawn-helper is exec'd by pty.node to set up the terminal's controlling tty;
# pty.node is dlopen'd by Node. Both are Mach-O and both must carry a signature
# for the Hardened Runtime to load them.
while IFS= read -r binary; do
  echo "  $(basename "$binary")"
  sign "" "$binary"
done < <(find "$SERVER/node_modules" -name 'pty.node' -o -name 'spawn-helper')

echo "  node"
sign macos/AllInOne-macOS/Sidecar.entitlements "$SERVER/bin/node"

# React Native ships its engine and modules as frameworks.
if [ -d "$APP/Contents/Frameworks" ]; then
  while IFS= read -r framework; do
    echo "  $(basename "$framework")"
    sign "" "$framework"
  done < <(find "$APP/Contents/Frameworks" -maxdepth 1 -type d -name '*.framework' -o -maxdepth 1 -name '*.dylib')
fi

echo "  AllInOne.app"
sign macos/AllInOne-macOS/AllInOne.entitlements "$APP"

say "Verifying signature"
codesign --verify --deep --strict --verbose=2 "$APP"

# --- Package ---------------------------------------------------------------
say "Building disk image"
rm -rf "$OUT" && mkdir -p "$OUT/staging"
cp -R "$APP" "$OUT/staging/"
ln -s /Applications "$OUT/staging/Applications"

DMG="$OUT/AllInOne.dmg"
hdiutil create -volname "All in one" -srcfolder "$OUT/staging" \
  -ov -format ULFO "$DMG" >/dev/null
rm -rf "$OUT/staging"

# --- Notarise --------------------------------------------------------------
# Without this, the first launch on another Mac is blocked outright: Gatekeeper
# tells the user the app "cannot be opened because Apple cannot check it for
# malicious software". Stapling attaches the result so that check works offline.
if [ "${SKIP_NOTARIZE:-0}" = "1" ]; then
  say "Skipping notarisation (SKIP_NOTARIZE=1)"
  echo "This build will only open cleanly on this Mac."
else
  say "Notarising (a few minutes)"
  xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait

  say "Stapling"
  xcrun stapler staple "$DMG"
  # Also staple the app inside, so a copy dragged out of the image carries its
  # own ticket rather than depending on the image it came from.
  hdiutil attach "$DMG" -nobrowse -quiet -mountpoint "$OUT/mnt"
  cp -R "$OUT/mnt/AllInOne.app" "$OUT/AllInOne.app"
  hdiutil detach "$OUT/mnt" -quiet
  xcrun stapler staple "$OUT/AllInOne.app"

  say "Gatekeeper check"
  spctl --assess --type exec --verbose=4 "$OUT/AllInOne.app"
fi

say "Done"
ls -lh "$DMG"
echo
echo "Send $DMG to any Mac (Apple Silicon, macOS 14+): open it and drag the app to Applications."
