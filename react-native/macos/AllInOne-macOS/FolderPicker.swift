import AppKit

/// The macOS folder chooser, exposed to JS.
///
/// The editor's root used to be a constant in `scripts/fileserver.mjs`, edited
/// by hand to move between projects. Choosing it at runtime needs a real
/// NSOpenPanel: React Native has no file dialog on macOS, and the web platform
/// deliberately hands back an opaque directory handle rather than the path the
/// file server has to be given.
@objc(FolderPicker)
final class FolderPicker: NSObject {
    /// AppKit is main-thread only, panel included.
    @objc static func requiresMainQueueSetup() -> Bool {
        true
    }

    /// Resolves the chosen absolute path, or `nil` when the panel is
    /// cancelled. Cancelling is an ordinary outcome rather than a failure —
    /// rejecting would throw into JS every time the user changes their mind.
    @objc func pick(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            let panel = NSOpenPanel()
            panel.canChooseDirectories = true
            panel.canChooseFiles = false
            panel.allowsMultipleSelection = false
            panel.message = "Choose the folder to edit"
            panel.prompt = "Open"

            // `begin` and not `runModal`: a modal run blocks the main thread,
            // which is the thread the bridge answers this call on.
            panel.begin { response in
                guard response == .OK, let url = panel.url else {
                    return resolve(nil)
                }

                resolve(url.path)
            }
        }
    }
}
