import {NativeModules, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {FileTreeProvider, useFileTree} from './fileTreeContext';
import {glass, useThemedStyles, withAlpha} from '../theme';
import {RowMenu, rowMenuSize} from './RowMenu';
import {useEffect, useRef, useState} from 'react';

import {ConfirmDelete} from './ConfirmDelete';
import {isSecondaryClick} from './TreeRow';
import {parentOf} from './fileTreeContext';
import {DirectoryContents} from './FileNode';
import {Icon} from '../icons';

export function FileTree({currentFile, onOpenFile, projectRoot, setProjectRoot, onEntryRenamed, onEntryRemoved}) {
  return (
    <FileTreeProvider
      projectRoot={projectRoot}
      currentFile={currentFile}
      onOpenFile={onOpenFile}
      onEntryRenamed={onEntryRenamed}
      onEntryRemoved={onEntryRemoved}>
      <FileTreeBody projectRoot={projectRoot} setProjectRoot={setProjectRoot} />
    </FileTreeProvider>
  );
}

function clamp(value, lowest, highest) {
  return Math.min(Math.max(value, lowest), Math.max(lowest, highest));
}

// Claimed so macOS stops handling these itself — Return and Delete both beep
// otherwise. The events reach JS either way; this only silences the system's
// own answer to them.
const KEY_DOWN_EVENTS = [
  {key: 'Enter'},
  {key: 'Backspace'},
  {key: 'Delete'},
  {key: 'F2'},
  {key: 'Escape'},
  {key: 'c', metaKey: true},
  {key: 'x', metaKey: true},
  {key: 'v', metaKey: true},
];

function FileTreeBody({projectRoot, setProjectRoot}) {
  const styles = useThemedStyles(createStyles);
  const {
    menu,
    draft,
    pendingDelete,
    selected,
    clipboard,
    problem,
    treeRef,
    openMenu,
    closeMenu,
    startCreate,
    startRename,
    requestDelete,
    refreshAll,
    collapseAll,
    copy,
    cut,
    paste,
    dismissProblem,
  } = useFileTree();

  // A click reports where it landed relative to the root view, and `measure`
  // reports view positions in that same frame — the one convention the whole
  // touch system is built on. Knowing where the panel starts is therefore
  // enough to turn a click anywhere into a point inside it.
  const [frame, setFrame] = useState({pageX: 0, pageY: 0, width: 0, height: 0});

  function measure() {
    treeRef.current?.measure?.((x, y, width, height, pageX, pageY) => setFrame({pageX, pageY, width, height}));
  }

  function openRootMenu(event) {
    const {pageX = 0, pageY = 0} = event?.nativeEvent ?? {};

    openMenu({entry: null, pageX, pageY});
  }

  /**
   * The shortcuts act on the selected row. Both of the things that take the
   * keyboard away from the tree — the inline name field and the delete dialog
   * — send their own keystrokes bubbling back through here on the way out, so
   * while either is open this stands down rather than acting on them twice.
   */
  // A file is pasted beside itself; a folder is pasted inside itself. With
  // nothing selected the project root is what is being talked about.
  function pasteTarget() {
    if (!selected) {
      return '';
    }

    return selected.isDirectory ? selected.fullPath : parentOf(selected.fullPath);
  }

  function onKeyDown(event) {
    const {key, metaKey, ctrlKey} = event.nativeEvent ?? event;

    if (draft || pendingDelete) {
      return;
    }

    // Paste is the one that works with nothing selected, so the clipboard keys
    // are answered before the tree asks whether there is a row to act on.
    if (metaKey || ctrlKey) {
      if (key === 'v') {
        return paste(pasteTarget());
      }

      if (key === 'c' && selected) {
        return copy(selected);
      }

      if (key === 'x' && selected) {
        return cut(selected);
      }

      return;
    }

    if (key === 'Escape') {
      return closeMenu();
    }

    if (!selected) {
      return;
    }

    if (key === 'Enter' || key === 'F2') {
      return startRename(selected);
    }

    // A full-size keyboard's forward delete arrives as `Delete`; the key most
    // Macs actually have is reported as `Backspace`.
    if (key === 'Backspace' || key === 'Delete') {
      return requestDelete(selected);
    }
  }

  // Handing focus back once the field or the dialog is gone, so the next
  // Return lands on the tree rather than on nothing.
  const wasEditing = useRef(false);

  useEffect(() => {
    const editing = Boolean(draft || pendingDelete);

    if (wasEditing.current && !editing) {
      treeRef.current?.focus?.();
    }

    wasEditing.current = editing;
  }, [draft, pendingDelete, treeRef]);

  async function openFolder() {
    const path = await NativeModules.FolderPicker.pick();

    if (!path) {
      return;
    }

    setProjectRoot(path);
  }

  // Drawn down and to the right of the pointer, then held inside the panel so
  // a click near an edge does not put the menu somewhere it cannot be reached.
  const menuSize = menu && rowMenuSize(menu.entry, clipboard);

  const menuPosition = menu && {
    left: clamp(menu.pageX - frame.pageX, 4, frame.width - menuSize.width - 4),
    top: clamp(menu.pageY - frame.pageY, 4, frame.height - menuSize.height - 4),
  };

  return (
    <View
      ref={treeRef}
      focusable
      enableFocusRing={false}
      onLayout={measure}
      onKeyDown={onKeyDown}
      keyDownEvents={KEY_DOWN_EVENTS}
      style={styles.panel}>
      <View style={[styles.header, !projectRoot && styles.headerWithoutProject]}>
        <Pressable onPress={openFolder} style={[styles.openFolder, !projectRoot && styles.noProjectRootRow]}>
          <Text style={[styles.openFolderText, !projectRoot && styles.noProjectRootRowText]}>Open folder</Text>
        </Pressable>

        {projectRoot && (
          <View style={styles.headerActions}>
            <HeaderAction name="new-file" onPress={() => startCreate('', 'file')} />
            <HeaderAction name="new-folder" onPress={() => startCreate('', 'directory')} />
            <HeaderAction name="refresh" onPress={refreshAll} />
            <HeaderAction name="collapse-all" onPress={collapseAll} />
          </View>
        )}
      </View>

      {problem && (
        <Pressable onPress={dismissProblem} style={styles.problem}>
          <Text style={styles.problemText}>{problem}</Text>
        </Pressable>
      )}

      {/* The empty space under the rows is still the project, so a click there
          means the project — which is what makes "new file at the top level"
          reachable without aiming at a particular row. Asked on the way back
          up rather than on the way down, so a row that wants the click keeps
          it and only what nothing else claimed arrives here. */}
      <ScrollView style={styles.tree} contentContainerStyle={styles.treeContent}>
        <View
          style={styles.treeContent}
          onStartShouldSetResponder={isSecondaryClick}
          onResponderGrant={openRootMenu}>
          <DirectoryContents directoryPath="" depth={0} />
        </View>
      </ScrollView>

      {menu && <RowMenu left={menuPosition.left} top={menuPosition.top} />}

      {pendingDelete && <ConfirmDelete />}
    </View>
  );
}

function HeaderAction({name, onPress}) {
  const styles = useThemedStyles(createStyles);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      style={[styles.headerAction, hovered && styles.headerActionHovered]}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}>
      <Icon name={name} size={16} color={styles.glyph.color} />
    </Pressable>
  );
}

const createStyles = colors => StyleSheet.create({
  panel: {
    ...glass(colors, {tint: 0.25}),
    marginBottom: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    flex: 1,
    // The menu and the delete dialog are absolutely placed against this panel,
    // so it has to be the frame they resolve against.
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  // With nothing open the header is only the call to action, which is allowed
  // the full width rather than a row's worth of it.
  headerWithoutProject: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 16,
  },
  openFolder: {
    flexShrink: 1,
  },
  openFolderText: {
    color: colors.onSurfaceVariant,
  },
  noProjectRootRow: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noProjectRootRowText: {
    color: colors.onPrimary,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  headerAction: {
    padding: 4,
    borderRadius: 6,
  },
  headerActionHovered: {
    backgroundColor: withAlpha(colors.onSurface, 0.08),
  },
  // What a copy, paste or delete says when it fails, since none of them has an
  // inline field to complain in. Tapping it is how it goes away.
  problem: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: withAlpha(colors.error, 0.15),
  },
  problemText: {
    color: colors.error,
    fontSize: 12,
  },
  tree: {
    flex: 1,
  },
  // Grown to fill the panel so the space below the last row is part of the
  // tree's own surface rather than the scroll view's backdrop.
  treeContent: {
    flexGrow: 1,
  },
  glyph: {
    color: colors.onSurfaceVariant,
  },
});
