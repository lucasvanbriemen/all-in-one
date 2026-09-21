import {Pressable, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {CodeEditor} from '../CodeEditor';
import {SmallButton} from './ui';
import {Tabs} from './Tabs';

/**
 * A tab bar over one Monaco instance. The page may show two of these side by
 * side; the one that last had focus is the active group, and that is where
 * the next file opens.
 */
export function EditorGroup({
  group,
  isActive,
  canSplit,
  hasOtherGroup,
  buffers,
  dirtyPaths,
  gitByPath,
  problemsByPath,
  gutterChanges,
  diff,
  conflict,
  appKeys,
  sources,
  projectRoot,
  editorRef,
  onActivateGroup,
  onActivateTab,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
  onMoveTab,
  onSplit,
  onMoveToOtherGroup,
  onCloseGroup,
  onChange,
  onSave,
  onCommand,
  onOpenFile,
  onCursor,
  onDiagnostics,
  onLoadError,
  onCloseDiff,
  onResolveConflict,
}) {
  const styles = useThemedStyles(createStyles);
  const path = group.active;
  const buffer = path ? buffers[path] : null;

  return (
    <View style={[styles.group, isActive && hasOtherGroup && styles.groupActive]} testID={`editor-group-${group.id}`}>
      <Tabs
        tabs={group.tabs}
        active={path}
        isActiveGroup={isActive}
        dirtyPaths={dirtyPaths}
        gitByPath={gitByPath}
        problemsByPath={problemsByPath}
        canSplit={canSplit}
        hasOtherGroup={hasOtherGroup}
        onActivate={tab => {
          onActivateGroup(group.id);
          onActivateTab(tab, group.id);
        }}
        onClose={tab => onCloseTab(tab, group.id)}
        onCloseOthers={tab => onCloseOthers(tab, group.id)}
        onCloseAll={() => onCloseAll(group.id)}
        onMove={(tab, to) => onMoveTab(tab, to, group.id)}
        onSplit={onSplit}
        onMoveToOtherGroup={onMoveToOtherGroup}
        onCloseGroup={() => onCloseGroup(group.id)}
      />

      {diff && (
        <View style={styles.banner} testID="diff-banner">
          <Text style={styles.bannerText}>Comparing {path?.split('/').pop()} with HEAD{diff.staged ? ' (staged)' : ''}</Text>
          <SmallButton title="Close diff" onPress={onCloseDiff} testID="close-diff" />
        </View>
      )}

      {conflict && (
        <View style={[styles.banner, styles.conflict]} testID="conflict-banner">
          <Text style={styles.bannerText}>This file changed on disk while you were editing it.</Text>
          <SmallButton title="Reload from disk" tone="accent" onPress={() => onResolveConflict(path, 'reload')} testID="conflict-reload" />
          <SmallButton title="Keep mine" onPress={() => onResolveConflict(path, 'keep')} testID="conflict-keep" />
        </View>
      )}

      <Pressable style={styles.editorWrap} onPressIn={() => onActivateGroup(group.id)}>
        <CodeEditor
          ref={editorRef}
          value={buffer?.contents ?? ''}
          path={path}
          projectRoot={projectRoot}
          sources={sources}
          appKeys={appKeys}
          gitChanges={gutterChanges}
          diffOriginal={diff ? diff.original : null}
          onChange={onChange}
          onSave={onSave}
          onCommand={onCommand}
          onOpenFile={onOpenFile}
          onCursor={onCursor}
          onDiagnostics={onDiagnostics}
          onLoadError={onLoadError}
          onFocus={() => onActivateGroup(group.id)}
          style={styles.editor}
        />

        {!path && (
          <View style={styles.empty} pointerEvents="none" testID="editor-empty">
            <Text style={styles.emptyTitle}>No file open</Text>
            <Text style={styles.emptyHint}>Pick one from the tree, or press ⌘P</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  group: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  groupActive: {},
  editorWrap: {
    flex: 1,
    position: 'relative',
  },
  editor: {
    flex: 1,
    borderRadius: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    ...glass(colors, {variant: 'tinted'}),
  },
  conflict: {
    borderColor: '#d29922',
  },
  bannerText: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 12.5,
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyTitle: {
    color: withAlpha(colors.onSurfaceVariant, 0.8),
    fontSize: 20,
    fontWeight: '700',
  },
  emptyHint: {
    color: withAlpha(colors.onSurfaceVariant, 0.7),
    fontSize: 12.5,
  },
});
