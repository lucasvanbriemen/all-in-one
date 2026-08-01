import SwiftUI
import Playgrounds

@main struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        #if os(macOS)
        .windowStyle(.hiddenTitleBar)
        #endif
    }
}

struct ContentView: View {
    @State private var isSidebarExpanded = true
    @State private var selection: SidebarItem.ID? = "Home"

    var body: some View {
        HStack(spacing: 0) {
            CollapsibleSidebar(
                items: SidebarItem.demo,
                selection: $selection,
                isExpanded: $isSidebarExpanded
            )

            Text(selection ?? "Hello, world!")
                .font(.largeTitle)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .transparentWindow(.blurred)
    }
}

#Preview {
    ContentView()
}

#Playground {
    _ = 1 + 2
}
