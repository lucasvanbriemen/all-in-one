import AppKit

@objc(ContextMenu)
final class ContextMenu: NSObject, NSMenuDelegate {
    @objc static func requiresMainQueueSetup() -> Bool {
        true
    }

    private var resolve: RCTPromiseResolveBlock?

    @objc func show(_ actions: [[String: Any]], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
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

            menu.popUp(positioning: nil, at: NSEvent.mouseLocation, in: nil)
        }
    }

    @objc private func choose(_ sender: NSMenuItem) {
        resolve?(sender.tag)
        resolve = nil
    }

    func menuDidClose(_ menu: NSMenu) {
        DispatchQueue.main.async {
            self.resolve?(nil)
            self.resolve = nil
        }
    }
}
