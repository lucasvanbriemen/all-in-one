import AppKit

/// A native right-click menu, shown at the mouse's current position. Promise
/// resolves with the index of the chosen action, or nil when the menu is
/// dismissed without choosing.
///
/// React Native macOS reports right clicks to JS (`onAuxClick`) but has no
/// menu primitive, and react-native-context-menu-view is UIKit-only, so this
/// is the macOS half of that idea: JS decides *when*, AppKit draws *what*.
@objc(ContextMenu)
final class ContextMenu: NSObject, NSMenuDelegate {
    @objc static func requiresMainQueueSetup() -> Bool {
        true
    }

    private var resolve: RCTPromiseResolveBlock?

    @objc func show(_ actions: [[String: Any]],
                    resolver resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            self.resolve = resolve

            let menu = NSMenu()
            menu.delegate = self
            menu.autoenablesItems = false

            for (index, action) in actions.enumerated() {
                let title = action["title"] as? String ?? ""
                let item = NSMenuItem(title: title, action: #selector(self.choose(_:)), keyEquivalent: "")
                item.target = self
                item.tag = index
                item.isEnabled = !(action["disabled"] as? Bool ?? false)
                menu.addItem(item)
            }

            // `in: nil` makes the point a screen coordinate, so the menu opens
            // wherever the mouse is — no view or layout lookup needed.
            menu.popUp(positioning: nil, at: NSEvent.mouseLocation, in: nil)
        }
    }

    @objc private func choose(_ sender: NSMenuItem) {
        resolve?(sender.tag)
        resolve = nil
    }

    // Fires after any item action, so a cancelled menu resolves with nil and a
    // chosen one has already resolved above.
    func menuDidClose(_ menu: NSMenu) {
        DispatchQueue.main.async {
            self.resolve?(nil)
            self.resolve = nil
        }
    }
}
