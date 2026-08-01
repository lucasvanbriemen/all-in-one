import SwiftUI
import AppKit

enum WindowTransparencyStyle {
    /// Frosted glass: the desktop behind the window is blurred, content stays readable.
    case blurred
    /// Fully see-through. Anything you don't paint shows the raw desktop.
    case clear
}

// Note: no manual traffic-light inset is needed. Even with a hidden titlebar,
// SwiftUI lays content out inside a 32pt top safe area, which already clears
// the window buttons.

extension View {
    /// Makes the window this view lives in translucent. No-op off macOS —
    /// iOS and visionOS don't expose window compositing to the app.
    @ViewBuilder
    func transparentWindow() -> some View {
        // .ignoresSafeArea is load-bearing: with a hidden titlebar the window's
        // content view is full-size but SwiftUI still lays out inside a 32pt
        // titlebar safe area. Without it the glass stops short and that strip
        // renders as raw transparency, since the window itself is not opaque.
        self.background(
            VisualEffectBackground(material: .hudWindow)
                .ignoresSafeArea()
        )
    }
}


/// AppKit's blur surface. `.behindWindow` blends with the desktop rather than
/// with sibling views, which is what makes the window itself look translucent.
private struct VisualEffectBackground: NSViewRepresentable {
    let material: NSVisualEffectView.Material

    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = material
        view.blendingMode = .behindWindow
        view.state = .active
        return view
    }

    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {
        nsView.material = material
    }
}
