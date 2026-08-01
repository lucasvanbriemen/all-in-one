import SwiftUI

struct SidebarItem: Identifiable, Hashable {
    let id: String
    let title: String
    let systemImage: String

    init(id: String? = nil, title: String, systemImage: String) {
        self.id = id ?? title
        self.title = title
        self.systemImage = systemImage
    }
}

struct CollapsibleSidebar: View {
    let items: [SidebarItem]
    @Binding var selection: SidebarItem.ID?

    /// Width of the icon-only rail.
    var collapsedWidth: CGFloat = 80
    /// Width when fully open.
    var expandedWidth: CGFloat = 240

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(items) { row in
                        rowView(for: row)
                    }
                }
            }
            .scrollBounceBehavior(.basedOnSize)

            Spacer(minLength: 0)
        }
        .padding(8)
        .frame(width:expandedWidth, alignment: .leading)
        // The labels keep their natural width and overflow the rail; clipping
        // makes them slide out of view instead of truncating mid-animation.
        .clipped()
        .background(.ultraThinMaterial)
        .overlay(alignment: .trailing) { Divider() }
    }

    @ViewBuilder
    private func rowView(for row: SidebarItem) -> some View {
        let item = row

        SidebarRow(
            title: item.title,
            systemImage: item.systemImage,
            depth: 0,
            isSelected: selection == item.id,
        ) {
            tap(item)
        }
    }

    private func tap(_ item: SidebarItem) {
        selection = item.id
    }
}

private struct SidebarRow: View {
    let title: String
    let systemImage: String
    let depth: Int
    let isSelected: Bool
    /// False on the collapsed rail, where only the icon should read.
    let action: () -> Void

    private let iconSize: CGFloat = 28

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .font(.system(size: 16, weight: .medium))
                    // Fixed box keeps the icon in place as the rail resizes.
                    .frame(width: iconSize, height: iconSize)

                Text(title)
                    .lineLimit(1)
                    .fixedSize()
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 5)
            .padding(.leading, CGFloat(depth) * 16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(isSelected ? Color.accentColor.opacity(0.18) : .clear)
            )
            .foregroundStyle(isSelected ? Color.accentColor : Color.primary)
            // Whole row is the hit target, including the transparent padding.
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(title)
        .accessibilityLabel(title)
    }
}