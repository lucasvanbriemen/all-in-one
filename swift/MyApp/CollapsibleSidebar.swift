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

    var body: some View {
        ScrollView {
            ForEach(items) { item in
                SidebarRow(
                    title: item.title,
                    systemImage: item.systemImage,
                    isSelected: selection == item.id
                ) {
                    selection = item.id
                }
            }
        }
        .padding(8)
        .frame(width:240, alignment: .leading)
        .background(.ultraThinMaterial)
    }
}

private struct SidebarRow: View {
    let title: String
    let systemImage: String
    let isSelected: Bool
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
            .padding(.leading, 16)
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