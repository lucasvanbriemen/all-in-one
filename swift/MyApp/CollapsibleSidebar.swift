import SwiftUI

struct CollapsibleSidebar: View {
    let items: [String]
    @Binding var selection: String?

    var body: some View {
        ScrollView {
            ForEach(items, id: \.self) { item in
                SidebarRow(title: item, isSelected: selection == item) {
                    selection = item
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
    let isSelected: Bool
    let action: () -> Void

    private let iconSize: CGFloat = 28

    var body: some View {
        Button(action: action) {
            Text(title)
            .padding(16)
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
    }
}