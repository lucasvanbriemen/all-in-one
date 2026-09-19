import {Field, GIT_COLORS, IconButton, SmallButton} from './ui';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useCallback, useMemo, useState} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

import {FileIcon} from '../icons/FileIcon';
import {Icon} from '../icons';
import {flattenTree} from './useFileTree';

const INDENT = 14;

/**
 * The project as rows. Folders expand in place; hovering a row shows what can
 * be done to it, and creating or renaming happens inline where the row is —
 * no dialogs. Colour comes from git: what is new, changed or gone.
 */
export function FileTree({
  projectRoot,
  tree,
  currentFile,
  openFiles = [],
  dirtyPaths,
  gitByPath,
  onOpenFile,
  onOpenFolder,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onCollapseAll,
}) {
  const styles = useThemedStyles(createStyles);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [hovered, setHovered] = useState(null);

  const rows = useMemo(() => flattenTree(tree.children, tree.expanded), [tree.children, tree.expanded]);

  // A folder is coloured by the most severe change inside it, so a change
  // three levels down is visible while the folder is collapsed.
  const folderState = useMemo(() => {
    const states = {};
    for (const [path, state] of Object.entries(gitByPath ?? {})) {
      const parts = path.split('/');
      for (let index = 1; index < parts.length; index++) {
        const folder = parts.slice(0, index).join('/');
        states[folder] = mostSevere(states[folder], state);
      }
    }
    return states;
  }, [gitByPath]);

  const startCreate = useCallback(
    (parent, kind) => {
      tree.expand(parent);
      setEditing({mode: kind, parent, value: ''});
      setConfirming(null);
    },
    [tree],
  );

  const commitEdit = useCallback(async () => {
    if (!editing) {
      return;
    }

    const value = editing.value.trim();
    setEditing(null);

    if (!value) {
      return;
    }

    if (editing.mode === 'file') {
      await onCreateFile?.(editing.parent ? `${editing.parent}/${value}` : value);
    } else if (editing.mode === 'folder') {
      await onCreateFolder?.(editing.parent ? `${editing.parent}/${value}` : value);
    } else if (editing.mode === 'rename') {
      const parent = editing.path.includes('/') ? editing.path.slice(0, editing.path.lastIndexOf('/')) : '';
      const to = parent ? `${parent}/${value}` : value;
      if (to !== editing.path) {
        await onRename?.(editing.path, to, editing.isDirectory);
      }
    }
  }, [editing, onCreateFile, onCreateFolder, onRename]);

  const onEditKey = useCallback(
    event => {
      if (event.nativeEvent.key === 'Escape') {
        setEditing(null);
      }
    },
    [],
  );

  const projectName = projectRoot?.split('/').filter(Boolean).pop() ?? '';

  return (
    <View style={styles.panel} testID="file-tree">
      <View style={styles.header}>
        <Pressable onPress={onOpenFolder} style={styles.projectName} tooltip={projectRoot ?? 'Open a folder'}>
          <Text style={styles.projectNameText} numberOfLines={1}>{projectName || 'No folder'}</Text>
        </Pressable>

        {projectRoot && (
          <View style={styles.headerActions}>
            <IconButton glyph="＋" label="New file" onPress={() => startCreate('', 'file')} testID="tree-new-file" />
            <IconButton glyph="⊞" label="New folder" onPress={() => startCreate('', 'folder')} testID="tree-new-folder" />
            <IconButton glyph="⟳" label="Refresh" onPress={tree.refresh} />
            <IconButton glyph="⇈" label="Collapse all" onPress={onCollapseAll} />
          </View>
        )}
      </View>

      {!projectRoot && (
        <SmallButton title="Open folder…" tone="accent" onPress={onOpenFolder} style={styles.openButton} />
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {editing && editing.mode !== 'rename' && editing.parent === '' && (
          <InlineEditor styles={styles} depth={0} editing={editing} setEditing={setEditing} onSubmit={commitEdit} onKeyPress={onEditKey} />
        )}

        {rows.map(row => {
          const isCurrent = row.fullPath === currentFile;
          const isOpen = openFiles.includes(row.fullPath);
          const isDirty = dirtyPaths?.has(row.fullPath);
          const git = row.isDirectory ? folderState[row.fullPath] : gitByPath?.[row.fullPath];
          const color = gitColor(git);
          const isHovered = hovered === row.fullPath;
          const isRenaming = editing?.mode === 'rename' && editing.path === row.fullPath;
          const isConfirming = confirming === row.fullPath;

          return (
            <View key={row.fullPath}>
              {isRenaming ? (
                <InlineEditor styles={styles} depth={row.depth} editing={editing} setEditing={setEditing} onSubmit={commitEdit} onKeyPress={onEditKey} icon={<FileIcon name={row.name} isDirectory={row.isDirectory} isOpen={row.isOpen} />} />
              ) : (
                <Pressable
                  onPress={() => (row.isDirectory ? tree.toggle(row.fullPath) : onOpenFile?.(row.fullPath))}
                  onHoverIn={() => setHovered(row.fullPath)}
                  onHoverOut={() => setHovered(current => (current === row.fullPath ? null : current))}
                  style={[styles.row, {paddingLeft: 4 + row.depth * INDENT}, isCurrent && styles.rowCurrent, isOpen && !isCurrent && styles.rowOpen]}
                  testID={`tree-row-${row.fullPath}`}>
                  <View style={styles.chevron}>
                    {row.isDirectory && <Icon name={row.isOpen ? 'chevron-down' : 'chevron-right'} size={12} color={styles.chevronColor.color} />}
                  </View>

                  <FileIcon name={row.name} isDirectory={row.isDirectory} isOpen={row.isOpen} />

                  <Text style={[styles.name, color && {color}, isCurrent && styles.nameCurrent]} numberOfLines={1}>
                    {row.name}
                  </Text>

                  {isDirty && <View style={styles.dirtyDot} />}

                  {git && !row.isDirectory && <Text style={[styles.gitLetter, {color}]}>{gitLetter(git)}</Text>}

                  {isConfirming ? (
                    <View style={styles.confirm}>
                      <Text style={styles.confirmText}>Delete?</Text>
                      <SmallButton title="Yes" tone="danger" onPress={() => { setConfirming(null); onDelete?.(row.fullPath, row.isDirectory); }} testID="tree-confirm-delete" />
                      <SmallButton title="No" onPress={() => setConfirming(null)} />
                    </View>
                  ) : (
                    (isHovered || isCurrent) && (
                      <View style={styles.rowActions}>
                        {row.isDirectory && <IconButton glyph="＋" label="New file" onPress={() => startCreate(row.fullPath, 'file')} />}
                        {row.isDirectory && <IconButton glyph="⊞" label="New folder" onPress={() => startCreate(row.fullPath, 'folder')} />}
                        <IconButton glyph="✎" label="Rename" size={12} onPress={() => { setConfirming(null); setEditing({mode: 'rename', path: row.fullPath, value: row.name, isDirectory: row.isDirectory}); }} testID={`tree-rename-${row.fullPath}`} />
                        <IconButton glyph="✕" label="Delete" size={12} tone="danger" onPress={() => setConfirming(row.fullPath)} testID={`tree-delete-${row.fullPath}`} />
                      </View>
                    )
                  )}
                </Pressable>
              )}

              {editing && editing.mode !== 'rename' && editing.parent === row.fullPath && row.isDirectory && (
                <InlineEditor styles={styles} depth={row.depth + 1} editing={editing} setEditing={setEditing} onSubmit={commitEdit} onKeyPress={onEditKey} />
              )}
            </View>
          );
        })}

        {projectRoot && rows.length === 0 && !tree.loading.has('') && (
          <Text style={styles.emptyText}>This folder is empty.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function InlineEditor({styles, depth, editing, setEditing, onSubmit, onKeyPress, icon}) {
  return (
    <View style={[styles.row, styles.editRow, {paddingLeft: 4 + depth * INDENT}]}>
      <View style={styles.chevron} />
      {icon ?? <Text style={styles.editGlyph}>{editing.mode === 'folder' ? '⊞' : '＋'}</Text>}
      <Field
        autoFocus
        value={editing.value}
        onChangeText={value => setEditing(current => (current ? {...current, value} : current))}
        onSubmitEditing={onSubmit}
        onKeyPress={onKeyPress}
        placeholder={editing.mode === 'folder' ? 'folder name' : editing.mode === 'file' ? 'file name' : 'new name'}
        style={styles.editField}
        testID="tree-inline-input"
      />
      <IconButton glyph="✓" label="Confirm" onPress={onSubmit} testID="tree-inline-confirm" />
      <IconButton glyph="✕" label="Cancel" onPress={() => setEditing(null)} />
    </View>
  );
}

const SEVERITY = {conflict: 5, deleted: 4, added: 3, untracked: 3, renamed: 2, modified: 1};

export function gitKind(state) {
  if (!state) {
    return null;
  }

  const {index = ' ', worktree = ' '} = state;

  if (index === 'U' || worktree === 'U' || (index === 'A' && worktree === 'A') || (index === 'D' && worktree === 'D')) {
    return 'conflict';
  }
  if (index === '?' || worktree === '?') {
    return 'untracked';
  }
  if (worktree === 'D' || index === 'D') {
    return 'deleted';
  }
  if (index === 'A') {
    return 'added';
  }
  if (index === 'R' || index === 'C') {
    return 'renamed';
  }
  if (worktree === 'M' || index === 'M' || worktree === 'T' || index === 'T') {
    return 'modified';
  }

  return null;
}

function mostSevere(a, b) {
  const kindA = typeof a === 'string' ? a : gitKind(a);
  const kindB = typeof b === 'string' ? b : gitKind(b);

  if (!kindA) {
    return kindB;
  }
  if (!kindB) {
    return kindA;
  }
  return (SEVERITY[kindA] ?? 0) >= (SEVERITY[kindB] ?? 0) ? kindA : kindB;
}

function gitColor(state) {
  const kind = typeof state === 'string' ? state : gitKind(state);
  return kind ? GIT_COLORS[kind] : null;
}

export function gitLetter(state) {
  const kind = gitKind(state);
  return {untracked: 'U', added: 'A', modified: 'M', deleted: 'D', renamed: 'R', conflict: '!'}[kind] ?? '';
}

const createStyles = colors => StyleSheet.create({
  panel: {
    flex: 1,
    ...glass(colors, {variant: 'subtle'}),
    marginBottom: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  projectName: {
    flex: 1,
  },
  projectNameText: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
  },
  openButton: {
    marginHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingRight: 4,
    borderRadius: 6,
  },
  rowCurrent: {
    backgroundColor: withAlpha(colors.primary, 0.22),
  },
  rowOpen: {
    backgroundColor: withAlpha(colors.onSurface, 0.05),
  },
  chevron: {
    width: 12,
    alignItems: 'center',
  },
  chevronColor: {
    color: colors.onSurfaceVariant,
  },
  name: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
  },
  nameCurrent: {
    fontWeight: '600',
  },
  dirtyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.onSurface,
    opacity: 0.8,
  },
  gitLetter: {
    fontSize: 11,
    fontWeight: '700',
    width: 12,
    textAlign: 'center',
  },
  rowActions: {
    flexDirection: 'row',
  },
  confirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  editRow: {
    height: 28,
  },
  editGlyph: {
    color: colors.onSurfaceVariant,
    width: 16,
    textAlign: 'center',
  },
  editField: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 13,
  },
  emptyText: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    padding: 8,
  },
});
