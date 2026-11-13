import AppKit
import React

// App-wide keyboard shortcuts for JS (see components/useKeyCommand.js).
//
// JS registers combos like "meta+k". A local NSEvent monitor sees every
// keyDown in the app before the first responder does, so a shortcut fires no
// matter what has focus (including a text input). A matched key is swallowed
// so it doesn't also beep or type; anything else passes through untouched.
@objc(KeyCommands)
final class KeyCommands: RCTEventEmitter {
    static let event = "keyCommand"

    private var commands = Set<String>()
    private var monitor: Any?
    private var hasListeners = false

    @objc override static func requiresMainQueueSetup() -> Bool { true }

    @objc override func supportedEvents() -> [String]! { [Self.event] }

    @objc override func startObserving() { hasListeners = true }
    @objc override func stopObserving() { hasListeners = false }

    @objc func setCommands(_ commands: [String]) {
        DispatchQueue.main.async {
            self.commands = Set(commands)
            self.installMonitorIfNeeded()
        }
    }

    private func installMonitorIfNeeded() {
        guard monitor == nil else { return }
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            guard let self, self.hasListeners else { return event }
            let combo = Self.combo(for: event)
            guard self.commands.contains(combo) else { return event }
            self.sendEvent(withName: Self.event, body: ["combo": combo])
            return nil
        }
    }

    // Same order as normalizeCombo() in useKeyCommand.js.
    private static func combo(for event: NSEvent) -> String {
        let flags = event.modifierFlags
        var parts: [String] = []
        if flags.contains(.command) { parts.append("meta") }
        if flags.contains(.control) { parts.append("ctrl") }
        if flags.contains(.option) { parts.append("alt") }
        if flags.contains(.shift) { parts.append("shift") }
        let key = (event.charactersIgnoringModifiers ?? "").lowercased()
        parts.append(key)
        return parts.joined(separator: "+")
    }

    deinit {
        if let monitor { NSEvent.removeMonitor(monitor) }
    }
}
