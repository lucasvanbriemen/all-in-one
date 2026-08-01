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
    func transparentWindow(_ style: WindowTransparencyStyle = .blurred) -> some View {
        #if os(macOS)
        // .ignoresSafeArea is load-bearing: with a hidden titlebar the window's
        // content view is full-size but SwiftUI still lays out inside a 32pt
        // titlebar safe area. Without it the glass stops short and that strip
        // renders as raw transparency, since the window itself is not opaque.
        switch style {
        case .blurred:
            background(
                VisualEffectBackground(material: .hudWindow)
                    .ignoresSafeArea()
            )
            .background(WindowConfigurator())
        case .clear:
            background(Color.clear.ignoresSafeArea())
                .background(WindowConfigurator())
        }
        #else
        self
        #endif
    }
}

#if os(macOS)
/// Reaches the hosting `NSWindow` and drops its opaque background so a
/// translucent SwiftUI background can show what's behind the window.
private struct WindowConfigurator: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        // The view isn't attached to a window yet during make; defer one tick.
        DispatchQueue.main.async {
            guard let window = view.window else { return }
            window.isOpaque = false
            window.backgroundColor = .clear
            window.titlebarAppearsTransparent = true
            // Without this the title string draws over the glass with no
            // titlebar behind it, which reads as a floating label.
            window.titleVisibility = .hidden
            // Chromeless window has no titlebar to grab, so let the glass drag it.
            window.isMovableByWindowBackground = true
        }
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {}
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
#endif
