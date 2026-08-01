import SwiftUI
import Playgrounds

@main struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .windowStyle(.hiddenTitleBar)
    }
}

struct ContentView: View {
    @State private var selection: String? = nil

    var body: some View {
        HStack(spacing: 0) {
            CollapsibleSidebar(
                items: [
                    "Email"
                ],
                selection: $selection,
            )

            Text(selection ?? "Hello, world!")
                .font(.largeTitle)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .transparentWindow()
    }
}

#Preview {
    ContentView()
}

#Playground {
    _ = 1 + 2
}
