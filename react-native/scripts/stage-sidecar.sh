#!/bin/bash
#
# Stages the file/terminal server into the built .app.
#
# The Code page talks to `http://127.0.0.1:4001` and `ws://127.0.0.1:4001/terminal`
# (see `components/fileSystem.js`). During development the Procfile runs that
# server; a copy of the app on someone else's Mac has no Procfile, so the server
# has to travel inside the bundle along with a Node runtime to execute it.
#
# Everything lands in `Contents/Resources/server`, which `SidecarServer.m`
# launches at startup and kills on quit.
#
# Run from Xcode as a build phase, or by hand:
#   scripts/stage-sidecar.sh path/to/AllInOne.app
set -euo pipefail

cd "$(dirname "$0")/.."

APP="${1:-${BUILT_PRODUCTS_DIR:-}/${PRODUCT_NAME:-}.app}"
if [ ! -d "$APP" ]; then
  echo "error: no .app at '$APP'" >&2
  exit 1
fi

DEST="$APP/Contents/Resources/server"

# The Node that runs the server. Resolved from whatever `node` is on PATH, but
# only after checking it is the real binary rather than a version-manager shim —
# asdf/nvm/volta all put a shell script on PATH, and copying that into the
# bundle would ship a script that looks for a toolchain the target Mac lacks.
NODE_BIN="${NODE_BINARY:-$(command -v node)}"
NODE_BIN="$("$NODE_BIN" -e 'process.stdout.write(process.execPath)')"

if ! file "$NODE_BIN" | grep -q 'Mach-O.*executable'; then
  echo "error: '$NODE_BIN' is not a Mach-O executable" >&2
  exit 1
fi

# Node links only against system frameworks (CoreFoundation, Security, libc++,
# libSystem), so the binary is self-contained and safe to relocate. A Node built
# against Homebrew's icu4c or openssl would not be — check rather than assume.
if otool -L "$NODE_BIN" | tail -n +2 | grep -qv -e '/System/' -e '/usr/lib/'; then
  echo "error: '$NODE_BIN' links against non-system libraries and cannot be bundled:" >&2
  otool -L "$NODE_BIN" | tail -n +2 | grep -v -e '/System/' -e '/usr/lib/' >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST/bin" "$DEST/node_modules"

cp "$NODE_BIN" "$DEST/bin/node"
cp scripts/fileserver.mjs scripts/terminal.mjs "$DEST/"

# Only the two runtime dependencies, not the whole tree: `ws` for the terminal
# socket and `node-pty` for the shell behind it. `node-pty`'s own dependency,
# `node-addon-api`, is headers used at compile time and absent at runtime.
cp -R node_modules/ws "$DEST/node_modules/ws"

# node-pty resolves its native module as `prebuilds/<platform>-<arch>/pty.node`
# with `spawn-helper` beside it (see its `lib/utils.js`), so `lib` and the
# matching prebuild are all that ship. The other platforms' prebuilds are dead
# weight in a macOS bundle and every Mach-O file in there would need signing.
mkdir -p "$DEST/node_modules/node-pty"
cp node_modules/node-pty/package.json "$DEST/node_modules/node-pty/"
cp -R node_modules/node-pty/lib "$DEST/node_modules/node-pty/lib"
find "$DEST/node_modules/node-pty/lib" -name '*.map' -delete
find "$DEST/node_modules/node-pty/lib" -name '*.test.js' -delete

for arch in ${SIDECAR_ARCHS:-arm64}; do
  src="node_modules/node-pty/prebuilds/darwin-$arch"
  if [ ! -d "$src" ]; then
    echo "error: no node-pty prebuild for darwin-$arch" >&2
    exit 1
  fi
  mkdir -p "$DEST/node_modules/node-pty/prebuilds/darwin-$arch"
  cp "$src/pty.node" "$src/spawn-helper" "$DEST/node_modules/node-pty/prebuilds/darwin-$arch/"
done

chmod +x "$DEST/bin/node"
find "$DEST/node_modules/node-pty/prebuilds" -name spawn-helper -exec chmod +x {} \;

echo "staged sidecar into $DEST ($(du -sh "$DEST" | cut -f1))"
