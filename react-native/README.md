# AllInOne — build & run

React Native app with three targets sharing one JS codebase in this directory.

| Target | Command | Native project | Notes |
|---|---|---|---|
| macOS | `npm run macos` | `macos/` | react-native-macos 0.81.9 |
| iPhone | `npm run ios -- --device "iPhone"` | `ios/` | react-native 0.81.6 |
| Web | `npm run web` | — | Vite + react-native-web; **currently broken**, see [Known issues](#known-issues) |

There is no Android target.

The JS entry point is `index.js`, which registers the component under the name in
`app.json` (`AllInOne`). Both native AppDelegates reference that exact string — if you
rename the app, `app.json`, `ios/AllInOne/AppDelegate.swift`, and
`macos/AllInOne-macOS/AppDelegate.mm` all have to agree or the app launches to a blank
screen.

---

## This Mac (already set up)

Everything is installed. Start Metro once, then build whichever target you want:

```sh
cd react-native
npm start                              # leave running in its own terminal
```

```sh
npm run macos                          # macOS app
npm run ios -- --device "iPhone"       # physical iPhone
```

If Metro is already running you'll see `A dev server is already running for this
project on port 8081` — that's fine, the build reuses it. Only one Metro is needed no
matter how many targets you build.

---

## A different Mac (first-time setup)

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | ≥ 20 | `package.json` `engines`; developed on 22.21.0 |
| Xcode | 26.x | 26.6 is what the fmt pin below is calibrated against |
| CocoaPods | ≥ 1.13 | `sudo gem install cocoapods`, or Homebrew |
| Watchman | — | Optional. Not installed on the current machine; Metro works without it |

There is no `.nvmrc` or `.tool-versions` — Node version is not pinned in-repo.

### 1. Install JS dependencies

```sh
cd react-native
npm install
```

### 2. Patch `fmt` (required for iOS — skip only if you never build for iPhone)

react-native 0.81.6 pins **fmt 11.0.2**, which does not compile under Xcode 26's
clang. The build dies in `Pods/fmt/src/format.cc` with:

```
error: call to consteval function
'fmt::basic_format_string<...>::basic_format_string<FMT_COMPILE_STRING, 0>'
is not a constant expression
```

Bumping to fmt 12.1.0 fixes it — that is the version `react-native-macos` already
pins, which is why the macOS target never hits this. Both podspecs must move together,
because `RCT-Folly` declares an exact `fmt` dependency:

```sh
cd react-native
sed -i '' 's/spec.version = "11.0.2"/spec.version = "12.1.0"/; s/:tag => "11.0.2"/:tag => "12.1.0"/' \
  node_modules/react-native/third-party-podspecs/fmt.podspec
sed -i '' 's/spec.dependency "fmt", "11.0.2"/spec.dependency "fmt", "12.1.0"/' \
  node_modules/react-native/third-party-podspecs/RCT-Folly.podspec
```

**This lives in `node_modules`, so every `npm install` reverts it.** Re-run it whenever
you reinstall dependencies. `ios/Podfile.lock` is committed pinning fmt 12.1.0, so an
unpatched checkout fails at `pod install` with *"CocoaPods could not find compatible
versions for pod fmt"* rather than at compile time — apply the patch **before**
installing pods.

Two things that look like they should work but don't, so don't waste time on them:

- `-DFMT_CONSTEVAL=` / `-DFMT_USE_CONSTEVAL=0` — `fmt/base.h` redefines both
  unconditionally with no `#ifndef` guard, so the command-line define is discarded.
- Overriding the podspec in the Podfile (`pod 'fmt', :podspec => ...`) — `use_react_native!`
  declares `fmt` itself, so CocoaPods fails with *"multiple dependencies with different
  sources"*.

Making this durable is a one-line job with `patch-package` (add the devDependency and a
`"postinstall": "patch-package"` script); it is deliberately **not** wired up yet.

### 3. Install pods

Each native target has its own `Podfile` and its own `Pods/` — installing one does not
cover the other.

```sh
cd react-native/ios   && pod install    # iPhone
cd react-native/macos && pod install    # macOS
```

Always open the generated **`.xcworkspace`**, never the `.xcodeproj`, if you build from
Xcode.

### 4. Node lookup from Xcode build phases

`ios/.xcode.env` resolves Node with `export NODE_BINARY=$(command -v node)`. Xcode
script phases don't load your shell profile, so with a version manager (nvm, asdf,
fnm) Node may not be on `PATH` and the bundling phase fails with `node: command not
found`. Fix it locally without touching the versioned file:

```sh
echo "export NODE_BINARY=$(command -v node)" > react-native/ios/.xcode.env.local
```

`.xcode.env.local` is gitignored. The same applies to `macos/`.

---

## iPhone

### Code signing

The project is set to automatic signing, currently against one specific Apple
Developer team:

| Setting | Value |
|---|---|
| `CODE_SIGN_STYLE` | `Automatic` |
| `DEVELOPMENT_TEAM` | `DGTBJZL464` |
| `PRODUCT_BUNDLE_IDENTIFIER` | `nl.lucasvanbriemen.AllInOne` |
| `IPHONEOS_DEPLOYMENT_TARGET` | 15.1 |

**Building under a different Apple ID requires changing both**, in Xcode under
*Signing & Capabilities* on the `AllInOne` target: set your own team, and change the
bundle identifier to something in a namespace you control. The existing identifier is
registered to the team above and will not provision for anyone else.

Do not revert it to the RN template's `org.reactjs.native.example.*` — that placeholder
is registered by many unrelated developers and provisioning against it is unreliable.

### Build and install

```sh
cd react-native
npm run ios -- --device "iPhone" --extra-params "-allowProvisioningUpdates"
```

`--device` takes the device's name as it appears in `xcrun xctrace list devices`; pass
the UDID instead if two devices share a name. `-allowProvisioningUpdates` lets
`xcodebuild` register the device and create the provisioning profile without opening
Xcode — omit it and a new device fails to sign.

List what's connected:

```sh
xcrun devicectl list devices          # physical devices, with UDIDs
xcrun xctrace list devices            # physical + simulators
```

For the simulator instead, drop `--device`: `npm run ios`.

### Connecting the phone to Metro

This is the part that most often looks like a broken build but isn't.

At build time the RN build script embeds your Mac's LAN IP into the app as `ip.txt`,
plus a full `main.jsbundle` as a fallback. On launch the app tries the dev server at
that IP on port 8081; if it can't reach it, it silently loads the embedded bundle
instead — the app renders normally but the JS is a **snapshot frozen at build time**,
with no Fast Refresh.

So if your edits aren't showing up, check the connection rather than the code:

```sh
curl -s http://localhost:8081/json/list        # targets currently attached to Metro
lsof -nP -iTCP:8081 | grep -v LISTEN           # live connections; phone shows a LAN IP
```

A phone that is genuinely attached appears as a target with the iOS bundle ID. If the
only entries are `[::1]`, that's the macOS app talking to Metro, not the phone.

To get a live connection:

- Put the phone on the **same Wi-Fi** as the Mac, and accept the iOS *Local Network*
  permission prompt.
- The IP is baked in at build time. If the Mac's IP changed since the last build,
  rebuild, or override it on the device: shake → *Configure Bundle Location* → `<mac-ip>:8081`.

Useful checks:

```sh
ipconfig getifaddr en0                                    # this Mac's LAN IP
cat ~/Library/Developer/Xcode/DerivedData/AllInOne-*/Build/Products/Debug-iphoneos/AllInOne.app/ip.txt
```

### Inspecting a running install

```sh
xcrun devicectl device info processes --device <UDID> | grep AllInOne
xcrun devicectl device process launch --device <UDID> --terminate-existing nl.lucasvanbriemen.AllInOne
```

---

## macOS

```sh
cd react-native
npm start
npm run macos
```

Deployment target is 14.0, architecture is arm64 (Apple Silicon), bundle ID `nl.ltvb.aio`,
team `DGTBJZL464`.

`macos/` pins fmt 12.1.0 through `react-native-macos`, so the iOS fmt patch above is
irrelevant here.

### The transparent window

`components/TransparentWindow.jsx` bridges `NSVisualEffectView` through a native view
registered by `macos/AllInOne-macOS/VisualEffectBackground.swift`, which is what makes
the window blend with the desktop.

It is guarded at runtime — it checks `UIManager.getViewManagerConfig('VisualEffectBackground')`
and degrades to a plain palette-tinted fill when the native view isn't registered. That
is why the same component runs unmodified on iPhone, where AppKit doesn't exist.

### Shipping it to another Mac

```sh
npm run macos:release      # → dist-macos/AllInOne.dmg
```

Open the disk image, drag the app to Applications. That's the whole install.

Two one-off setup steps before the first release build:

1. **A Developer ID Application certificate.** Xcode → Settings → Accounts → select the
   team → Manage Certificates → **+** → *Developer ID Application*. Needs the Account
   Holder or Admin role on the developer account. The *Apple Development* certificate
   already in the keychain is not a substitute — it only authorises Macs registered to
   the account, and Gatekeeper refuses it anywhere else.

2. **Notarisation credentials**, stored once in the keychain:

   ```sh
   xcrun notarytool store-credentials AIO_NOTARY \
     --apple-id <your Apple ID> --team-id DGTBJZL464 \
     --password <app-specific password from appleid.apple.com>
   ```

   Without notarisation macOS refuses the app outright on any other machine — *"cannot
   be opened because Apple cannot check it for malicious software"*. The script staples
   the ticket to both the disk image and the app inside it, so the check also passes
   offline.

`SKIP_NOTARIZE=1` builds a signed but un-notarised app, which opens on this Mac only.
`SIGN_IDENTITY="..."` overrides the certificate lookup, for rehearsing the pipeline.

### The bundled server

The Code page reads and writes files over `http://127.0.0.1:4001` — and creates,
renames and deletes them there too, which is what the explorer's own editing runs
on — and runs its shell over `ws://127.0.0.1:4001/terminal`. In development the Procfile starts that server; a
copy of the app on someone else's Mac has no Procfile, so the release build carries the
server *and* a Node runtime to execute it inside the bundle.

- `scripts/stage-sidecar.sh` copies `node`, the two server scripts, and the two runtime
  dependencies (`ws`, `node-pty`) into `Contents/Resources/server`. It runs as an Xcode
  build phase, so a plain `npm run macos` gets one too.
- `macos/AllInOne-macOS/SidecarServer.m` starts it at launch and stops it on quit. It
  also holds a pipe on the server's stdin for the app's lifetime; the server exits on
  EOF, so a crash or `kill -9` can't leave an orphan squatting on port 4001.
- If port 4001 is already served — the usual case during development, where the
  Procfile got there first — the bundled copy stands down and the app uses the running
  server. Both are the same code, so it makes no difference which one answers.

This is why the app is **not sandboxed** (see `AllInOne-macOS/AllInOne.entitlements`).
A sandboxed app cannot fork a pty or write to files it wasn't handed through an open
panel, so the Code page cannot work inside one. Notarisation requires the Hardened
Runtime instead, which is on; the bundled `node` carries its own entitlements
(`Sidecar.entitlements`) because V8 needs to generate code at runtime.

The Node binary is ~110 MB, so the installed app is ~120 MB and the compressed disk
image ~40 MB.

**Intel Macs.** The build is arm64-only. Making it universal means setting `ARCHS` back
to `$(ARCHS_STANDARD)`, plus a universal `node` (`lipo` the official arm64 and x64
builds together) and `SIDECAR_ARCHS="arm64 x64"` for the node-pty prebuilds — roughly
another 110 MB in the bundle.

---

## Web

```sh
npm run web          # dev server on http://localhost:5173
npm run web:build    # production bundle → dist/
```

`vite.config.js` aliases `react-native` → `react-native-web` and resolves `.web.jsx`
ahead of `.jsx`, mirroring how Metro prefers `.macos.jsx` on the native side.

**This target does not currently build** — see below.

---

## Known issues

**Web build fails on `TransparentWindow`.** `npm run web:build` errors with:

```
components/TransparentWindow.jsx (1:37): "requireNativeComponent" is not exported
by "node_modules/react-native-web/dist/index.js"
```

The runtime guard described above doesn't help here: Rollup resolves imports
statically, so it fails before any guard executes. `vite.config.js` is already set up
to resolve a `.web.jsx` override ahead of the native file — the fix is to add
`components/TransparentWindow.web.jsx` exporting `TransparentWindow` and `GlassPanel`
without touching `requireNativeComponent`. That file has never existed.

**Phone layout is macOS-shaped.** `App.jsx` hardcodes a 48pt top inset to clear the
macOS traffic lights, and the sidebar sits in a `flexDirection: 'row'` split. It runs on
iPhone but doesn't lay out sensibly, and `react-native-safe-area-context` is a
dependency but unused.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `could not find compatible versions for pod "fmt"` | fmt patch not applied to a fresh `node_modules` |
| `call to consteval function ... is not a constant expression` | Same, but pods installed before the lock pinned 12.1.0 |
| `multiple dependencies with different sources for 'fmt'` | A `pod 'fmt'` override was added to a Podfile — remove it |
| `node: command not found` in an Xcode phase | Create `.xcode.env.local` (see above) |
| `EADDRINUSE :::8081` | Metro already running — reuse it, don't start a second |
| App runs but JS edits don't appear | Loading the embedded bundle, not Metro |
| Device build won't sign | Missing `-allowProvisioningUpdates`, or a team/bundle-ID mismatch |

Reset caches when Metro behaves oddly:

```sh
npm start -- --reset-cache
```

Full native rebuild:

```sh
rm -rf ios/build ~/Library/Developer/Xcode/DerivedData/AllInOne-*
cd ios && pod install
```
