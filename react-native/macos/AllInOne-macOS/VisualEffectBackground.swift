import AppKit

/// AppKit's blur surface, exposed to JS. This is the one piece of the SwiftUI
/// app that cannot move to JavaScript — React Native has no material/blur
/// primitive on macOS.
///
/// `materialName` rather than `material` because NSVisualEffectView already
/// defines a `material` property of a different type. Keeping the material
/// selectable from JS means it can be tuned with a Metro reload instead of a
/// native rebuild.
final class VisualEffectBackground: NSVisualEffectView {
    @objc var materialName: NSString = "hudWindow" {
        didSet { applyMaterial() }
    }

    /// `.behindWindow` blends with the desktop, which is what makes the window
    /// look translucent. `.withinWindow` blends with sibling views instead —
    /// stacking that over another blur reads as nearly opaque.
    @objc var blendsBehindWindow: Bool = true {
        didSet { applyMaterial() }
    }

    private static let materials: [String: NSVisualEffectView.Material] = [
        "hudWindow": .hudWindow,
        "sidebar": .sidebar,
        "popover": .popover,
        "menu": .menu,
        "selection": .selection,
        "titlebar": .titlebar,
        "headerView": .headerView,
        "sheet": .sheet,
        "windowBackground": .windowBackground,
        "underWindowBackground": .underWindowBackground,
        "contentBackground": .contentBackground,
        "fullScreenUI": .fullScreenUI,
        "toolTip": .toolTip,
    ]

    private func applyMaterial() {
        material = Self.materials[materialName as String] ?? .hudWindow
        blendingMode = blendsBehindWindow ? .behindWindow : .withinWindow
        // Emphasized draws a stronger, more opaque variant when the window is
        // key — not wanted here.
        isEmphasized = false
        state = .active
    }
}

@objc(VisualEffectBackgroundManager)
final class VisualEffectBackgroundManager: RCTViewManager {
    override func view() -> NSView! {
        let view = VisualEffectBackground()
        view.state = .active
        return view
    }

    override static func requiresMainQueueSetup() -> Bool { true }
}
