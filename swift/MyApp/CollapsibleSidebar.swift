import SwiftUI

struct SidebarItem: Identifiable, Hashable {
    let id: String
    let title: String
    let systemImage: String
    let children: [SidebarItem]

    init(id: String? = nil, title: String, systemImage: String, children: [SidebarItem] = []) {
        self.id = id ?? title
        self.title = title
        self.systemImage = systemImage
        self.children = children
    }

    var hasChildren: Bool { !children.isEmpty }
}

/// A sidebar that collapses to an icon-only rail instead of disappearing.
/// Rows stay tappable in both states; groups disclose inline when expanded
/// and in a popover when collapsed.
struct CollapsibleSidebar: View {
    let items: [SidebarItem]
    @Binding var selection: SidebarItem.ID?
    @Binding var isExpanded: Bool

    /// Width of the icon-only rail.
    var collapsedWidth: CGFloat = 60
    /// Width when fully open.
    var expandedWidth: CGFloat = 240

    @State private var disclosedGroups: Set<SidebarItem.ID> = []
    @State private var popoverGroup: SidebarItem.ID?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            SidebarRow(
                title: isExpanded ? "Collapse" : "Expand",
                systemImage: "sidebar.leading",
                depth: 0,
                state: .leaf,
                isSelected: false,
                showsLabel: isExpanded
            ) {
                isExpanded.toggle()
            }

            Divider()
                .padding(.vertical, 6)

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(visibleRows) { row in
                        rowView(for: row)
                    }
                }
            }
            .scrollBounceBehavior(.basedOnSize)

            Spacer(minLength: 0)
        }
        .padding(8)
        .frame(width: isExpanded ? expandedWidth : collapsedWidth, alignment: .leading)
        // The labels keep their natural width and overflow the rail; clipping
        // makes them slide out of view instead of truncating mid-animation.
        .clipped()
        .background(.ultraThinMaterial)
        .overlay(alignment: .trailing) { Divider() }
        .animation(.snappy(duration: 0.25), value: isExpanded)
        .onChange(of: isExpanded) { _, _ in popoverGroup = nil }
    }

    @ViewBuilder
    private func rowView(for row: VisibleRow) -> some View {
        let item = row.item
        let isDisclosed = disclosedGroups.contains(item.id)

        SidebarRow(
            title: item.title,
            systemImage: item.systemImage,
            depth: row.depth,
            state: item.hasChildren ? .group(isDisclosed: isDisclosed) : .leaf,
            isSelected: selection == item.id,
            showsLabel: isExpanded
        ) {
            tap(item)
        }
        // Collapsed rail has no room to disclose inline, so children arrive
        // in a popover anchored to the icon.
        .popover(
            isPresented: popoverBinding(for: item),
            attachmentAnchor: .rect(.bounds),
            arrowEdge: .trailing
        ) {
            ChildPopover(item: item, selection: $selection) {
                popoverGroup = nil
            }
        }
    }

    private func tap(_ item: SidebarItem) {
        guard item.hasChildren else {
            selection = item.id
            popoverGroup = nil
            return
        }
        if isExpanded {
            if disclosedGroups.contains(item.id) {
                disclosedGroups.remove(item.id)
            } else {
                disclosedGroups.insert(item.id)
            }
        } else {
            popoverGroup = (popoverGroup == item.id) ? nil : item.id
        }
    }

    private func popoverBinding(for item: SidebarItem) -> Binding<Bool> {
        Binding(
            get: { !isExpanded && item.hasChildren && popoverGroup == item.id },
            set: { shown in if !shown { popoverGroup = nil } }
        )
    }

    /// Flattened list of rows currently on screen. Flattening here keeps the
    /// view hierarchy non-recursive — a recursive `View` can't type-check.
    private var visibleRows: [VisibleRow] {
        var rows: [VisibleRow] = []
        func walk(_ items: [SidebarItem], depth: Int) {
            for item in items {
                rows.append(VisibleRow(item: item, depth: depth))
                // Nested rows only make sense in the wide state.
                if isExpanded, item.hasChildren, disclosedGroups.contains(item.id) {
                    walk(item.children, depth: depth + 1)
                }
            }
        }
        walk(items, depth: 0)
        return rows
    }
}

private struct VisibleRow: Identifiable {
    let item: SidebarItem
    let depth: Int
    var id: SidebarItem.ID { item.id }
}

private enum RowState {
    case leaf
    case group(isDisclosed: Bool)
}

private struct SidebarRow: View {
    let title: String
    let systemImage: String
    let depth: Int
    let state: RowState
    let isSelected: Bool
    /// False on the collapsed rail, where only the icon should read.
    var showsLabel: Bool = true
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
                    .opacity(showsLabel ? 1 : 0)

                Spacer(minLength: 4)

                if case let .group(isDisclosed) = state {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .rotationEffect(.degrees(isDisclosed ? 90 : 0))
                        .foregroundStyle(.secondary)
                        .opacity(showsLabel ? 1 : 0)
                }
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

/// Children of a group, shown when the sidebar is collapsed to the rail.
private struct ChildPopover: View {
    let item: SidebarItem
    @Binding var selection: SidebarItem.ID?
    let dismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(item.title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 6)
                .padding(.bottom, 2)

            ForEach(item.children) { child in
                Button {
                    selection = child.id
                    dismiss()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: child.systemImage)
                            .frame(width: 18)
                        Text(child.title)
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 4)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .frame(minWidth: 160, alignment: .leading)
    }
}

#Preview("Expanded") {
    SidebarDemo(startExpanded: true)
}

#Preview("Collapsed") {
    SidebarDemo(startExpanded: false)
}

private struct SidebarDemo: View {
    @State private var isExpanded: Bool
    @State private var selection: SidebarItem.ID? = "Home"

    init(startExpanded: Bool) {
        _isExpanded = State(initialValue: startExpanded)
    }

    var body: some View {
        HStack(spacing: 0) {
            CollapsibleSidebar(
                items: SidebarItem.demo,
                selection: $selection,
                isExpanded: $isExpanded
            )
            Text(selection ?? "Nothing selected")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .frame(minWidth: 520, minHeight: 360)
    }
}
