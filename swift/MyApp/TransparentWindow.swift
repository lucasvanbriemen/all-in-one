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
    @ViewBuilder
    func transparentWindow() -> some View {
        self.background(VisualEffectBackground(material: .hudWindow).ignoresSafeArea())
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
