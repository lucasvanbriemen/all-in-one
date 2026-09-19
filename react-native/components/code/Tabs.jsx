import {IconButton, SEVERITY_COLORS} from './ui';
import {PanResponder, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {FileIcon} from '../icons/FileIcon';
import {gitKind} from './FileTree';
import {GIT_COLORS} from './ui';

/**
 * One editor group's tabs. A tab shows its file's name, a dot while unsaved,
 * its git colour and an error count; it closes from its own button or the
 * shortcut, and drags sideways to reorder. The trailing "⋯" is the group's
 * menu: close others, close all, split, and where there are two groups, move
 * to the other one.
 */
export function Tabs({
  tabs,
  active,
  isActiveGroup,
  dirtyPaths,
  gitByPath,
  problemsByPath,
  canSplit,
  hasOtherGroup,
  onActivate,
  onClose,
  onCloseOthers,
  onCloseAll,
  onMove,
  onSplit,
  onMoveToOtherGroup,
  onCloseGroup,
}) {
  const styles = useThemedStyles(createStyles);
  const [menuOpen, setMenuOpen] = useState(false);
  const widths = useRef({});

  // Tabs that share a file name show enough of their folder to tell apart.
  const labels = useMemo(() => disambiguate(tabs), [tabs]);

  const dropIndex = useCallback(
    (path, dx) => {
      const from = tabs.indexOf(path);
      let offset = dx;
      let index = from;

      if (dx > 0) {
        while (index < tabs.length - 1 && offset > (widths.current[tabs[index + 1]] ?? 100) / 2) {
          offset -= widths.current[tabs[index + 1]] ?? 100;
          index++;
        }
      } else {
        while (index > 0 && -offset > (widths.current[tabs[index - 1]] ?? 100) / 2) {
          offset += widths.current[tabs[index - 1]] ?? 100;
          index--;
        }
      }

      return index;
    },
    [tabs],
  );

  return (
    <View style={[styles.bar, isActiveGroup && styles.barActive]} testID="tabs">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} keyboardShouldPersistTaps="always">
        {tabs.map(path => (
          <Tab
            key={path}
            path={path}
            label={labels[path]}
            isActive={path === active}
            isDirty={dirtyPaths?.has(path)}
            gitColor={gitColorFor(gitByPath?.[path])}
            problems={problemsByPath?.[path]}
            onActivate={() => onActivate(path)}
            onClose={() => onClose(path)}
            onDrop={dx => {
              const to = dropIndex(path, dx);
              if (to !== tabs.indexOf(path)) {
                onMove?.(path, to);
              }
            }}
            onLayout={event => {
              widths.current[path] = event.nativeEvent.layout.width;
            }}
            styles={styles}
          />
        ))}
      </ScrollView>

      {tabs.length > 0 && (
        <View style={styles.menuAnchor}>
          <IconButton glyph="⋯" label="Tab actions" onPress={() => setMenuOpen(open => !open)} testID="tabs-menu" />

          {menuOpen && (
            <View style={styles.menu} testID="tabs-menu-open">
              <MenuItem label="Close" onPress={() => { setMenuOpen(false); active && onClose(active); }} styles={styles} />
              <MenuItem label="Close others" onPress={() => { setMenuOpen(false); active && onCloseOthers?.(active); }} styles={styles} />
              <MenuItem label="Close all" onPress={() => { setMenuOpen(false); onCloseAll?.(); }} styles={styles} />
              {canSplit && <MenuItem label="Split right" onPress={() => { setMenuOpen(false); onSplit?.(); }} styles={styles} />}
              {hasOtherGroup && active && <MenuItem label="Move to other group" onPress={() => { setMenuOpen(false); onMoveToOtherGroup?.(active); }} styles={styles} />}
              {hasOtherGroup && <MenuItem label="Close group" onPress={() => { setMenuOpen(false); onCloseGroup?.(); }} styles={styles} />}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function MenuItem({label, onPress, styles}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable onPress={onPress} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} style={[styles.menuItem, hovered && styles.menuItemHovered]}>
      <Text style={styles.menuItemText}>{label}</Text>
    </Pressable>
  );
}

function Tab({path, label, isActive, isDirty, gitColor, problems, onActivate, onClose, onDrop, onLayout, styles}) {
  const [hovered, setHovered] = useState(false);
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);

  // A press that moves becomes a drag; one that does not is a click. The tab
  // follows the pointer and, on release, is reordered by how far it went.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          dragging.current = true;
        },
        onPanResponderMove: (_, gesture) => setDragX(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          dragging.current = false;
          setDragX(0);
          onDrop(gesture.dx);
        },
        onPanResponderTerminate: () => {
          dragging.current = false;
          setDragX(0);
        },
      }),
    [onDrop],
  );

  const errors = problems?.errors ?? 0;
  const warnings = problems?.warnings ?? 0;
  const name = path.split('/').pop();

  return (
    <Pressable
      {...responder.panHandlers}
      onPress={() => {
        if (!dragging.current) {
          onActivate();
        }
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onLayout={onLayout}
      style={[styles.tab, isActive && styles.tabActive, dragX !== 0 && {transform: [{translateX: dragX}], zIndex: 10, opacity: 0.85}]}
      testID={`tab-${path}`}
      tooltip={path}>
      <FileIcon name={name} size={14} />

      <Text style={[styles.tabText, isActive && styles.tabTextActive, gitColor && {color: gitColor}, errors > 0 && {color: SEVERITY_COLORS.error}]} numberOfLines={1}>
        {label}
      </Text>

      {(errors > 0 || warnings > 0) && (
        <Text style={[styles.problems, {color: errors > 0 ? SEVERITY_COLORS.error : SEVERITY_COLORS.warning}]}>
          {errors > 0 ? errors : warnings}
        </Text>
      )}

      {isDirty && !hovered ? (
        <View style={styles.dirtyDot} testID={`tab-dirty-${path}`} />
      ) : (
        <IconButton glyph="×" label={`Close ${name}`} size={15} onPress={onClose} style={[styles.close, !hovered && !isActive && styles.closeHidden]} testID={`tab-close-${path}`} />
      )}
    </Pressable>
  );
}

function gitColorFor(state) {
  const kind = gitKind(state);
  return kind ? GIT_COLORS[kind] : null;
}

/** `a/index.js` and `b/index.js` show as `a/index.js` and `b/index.js`, not twice `index.js`. */
export function disambiguate(paths) {
  const byName = {};
  for (const path of paths) {
    const name = path.split('/').pop();
    (byName[name] ??= []).push(path);
  }

  const labels = {};
  for (const [name, group] of Object.entries(byName)) {
    if (group.length === 1) {
      labels[group[0]] = name;
      continue;
    }

    for (const path of group) {
      const parts = path.split('/');
      let depth = 2;
      let label = parts.slice(-depth).join('/');

      while (group.some(other => other !== path && other.split('/').slice(-depth).join('/') === label) && depth < parts.length) {
        depth++;
        label = parts.slice(-depth).join('/');
      }

      labels[path] = label;
    }
  }

  return labels;
}

const createStyles = colors => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    paddingHorizontal: 4,
    borderRadius: 12,
    ...glass(colors, {variant: 'subtle'}),
    opacity: 0.85,
  },
  barActive: {
    opacity: 1,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 3,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 4,
    height: 28,
    borderRadius: 9,
    maxWidth: 240,
  },
  tabActive: {
    ...glass(colors, {variant: 'accent'}),
  },
  tabText: {
    color: colors.onSurface,
    fontSize: 12.5,
    flexShrink: 1,
  },
  tabTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  problems: {
    fontSize: 10,
    fontWeight: '700',
  },
  dirtyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 7,
    backgroundColor: colors.onSurface,
  },
  close: {
    width: 20,
    height: 20,
  },
  closeHidden: {
    opacity: 0,
  },
  menuAnchor: {
    position: 'relative',
    zIndex: 20,
  },
  menu: {
    position: 'absolute',
    top: 26,
    right: 0,
    minWidth: 180,
    padding: 4,
    borderRadius: 10,
    ...glass(colors, {variant: 'surface'}),
    backgroundColor: colors.surface ?? withAlpha(colors.onSurface, 0.1),
    zIndex: 30,
  },
  menuItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  menuItemHovered: {
    backgroundColor: withAlpha(colors.primary, 0.25),
  },
  menuItemText: {
    color: colors.onSurface,
    fontSize: 12.5,
  },
});
