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
                items: [
                    SidebarItem(title: "Home", systemImage: "house"),
                    SidebarItem(title: "Library", systemImage: "books.vertical", children: [
                        SidebarItem(title: "Recents", systemImage: "clock"),
                        SidebarItem(title: "Playlists", systemImage: "music.note.list", children: [
                            SidebarItem(title: "Focus", systemImage: "circle"),
                            SidebarItem(title: "Workout", systemImage: "circle"),
                        ]),
                    ]),
                    SidebarItem(title: "Favorites", systemImage: "star"),
                    SidebarItem(title: "Settings", systemImage: "gearshape", children: [
                        SidebarItem(title: "General", systemImage: "slider.horizontal.3"),
                        SidebarItem(title: "Advanced", systemImage: "wrench.and.screwdriver"),
                    ])
                ],
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
