import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useEffect, useRef, useState} from 'react';
import {useTheme, useThemedStyles, withAlpha} from '../theme';

import {FileIcon} from '../icons/FileIcon';
import {Icon} from '../icons';
import {useFileTree} from './fileTreeContext';

// One row's worth of indentation per level, and a gutter the width of the
// chevron so a folder's contents line up under its name, not under its arrow.
const INDENT = 12;
const GUTTER = 16;

/**
 * Escape is listed for a different reason than the keys claimed elsewhere.
 * A single-line field on macOS never sees it as a key *down*: the field editor
 * turns it into `cancelOperation:` first, and react-native-macos answers that
 * by reporting a key *press* — which is why the handler below is `onKeyPress`.
 * What listing it here does is stop the field editor resigning focus on the
 * way through, leaving the cancel entirely ours to perform.
 */
const KEY_DOWN_EVENTS = [{key: 'Escape'}];

function indentFor(depth) {
  return 4 + depth * INDENT;
}

// AppKit sends a secondary click through the same path as a primary one, and
// the touch it produces says which button it came from — but `Pressability`
// drops every non-primary button on the floor, so `onPress` and friends never
// hear about it. The responder system underneath them does, which is why the
// menu is opened from there rather than from a `Pressable`.
export const SECONDARY_BUTTON = 2;

export function isSecondaryClick(event) {
  return (event?.nativeEvent?.button ?? 0) === SECONDARY_BUTTON;
}

/**
 * A row for something that exists on disk. Pressing it selects it — which is
 * what the tree's keyboard shortcuts act on — and then opens or expands it.
 */
export function TreeRow({entry, depth, isOpen, onPress}) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const {currentFile, selected, select, openMenu, focusTree} = useFileTree();
  const [hovered, setHovered] = useState(false);

  const isCurrent = !entry.isDirectory && currentFile === entry.fullPath;
  const isSelected = selected?.fullPath === entry.fullPath;

  // Selecting first, always: a right-click on a row is a statement about that
  // row, not about whichever one happened to be selected before it.
  function selectRow() {
    select(entry);
    focusTree();
  }

  /**
   * Opened where the pointer is, like any other menu on this platform. Touch
   * positions and view measurements share one frame — both are relative to the
   * root view — so the tree can subtract its own origin and get a point.
   */
  function openRowMenu(event) {
    const {pageX = 0, pageY = 0} = event?.nativeEvent ?? {};

    selectRow();
    openMenu({entry, pageX, pageY});
  }

  return (
    // Claimed during the capture phase, which is the only way to get in front
    // of the `Pressable` below — it says yes to everything, and the deepest
    // willing view wins the bubble. Only a secondary click is taken, so an
    // ordinary press falls through to the row itself untouched.
    <View onStartShouldSetResponderCapture={isSecondaryClick} onResponderGrant={openRowMenu}>
      <Pressable
        style={[
          styles.row,
          {paddingLeft: indentFor(depth)},
          hovered && styles.rowHovered,
          isCurrent && styles.rowCurrent,
          isSelected && styles.rowSelected,
        ]}
        onPressIn={selectRow}
        onPress={onPress}
        onLongPress={openRowMenu}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}>
        {entry.isDirectory ? (
          <Icon name={isOpen ? 'chevron-down' : 'chevron-right'} size={GUTTER} color={colors.onSurfaceVariant} />
        ) : (
          <View style={styles.gutter} />
        )}

        <FileIcon name={entry.name} isDirectory={entry.isDirectory} isOpen={isOpen} />

        <Text numberOfLines={1} style={[styles.name, isCurrent && styles.nameCurrent]}>
          {entry.name}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The row that is being typed rather than read: one of these replaces a name
 * while it is renamed, and one sits inside a folder while a new entry is named.
 *
 * The text stays local. The tree above only needs the finished name, and
 * putting every keystroke through the shared state would redraw every row in
 * the project to show one changing character.
 *
 * Committing on blur is deliberate — the field is dismissed by clicking away
 * from it far more often than by pressing Return, and losing the name to that
 * is the annoying half of the trade. Escape is the way to mean "no".
 */
export function DraftRow({depth}) {
  const styles = useThemedStyles(createStyles);
  const {draft, commitDraft, cancelDraft, clearDraftError} = useFileTree();
  const input = useRef(null);

  const [name, setName] = useState(draft.initialName);

  // Return both commits and blurs. Without this the blur handler would run a
  // second time against a draft the commit has not finished clearing yet.
  const settled = useRef(false);

  useEffect(() => {
    input.current?.focus?.();
  }, []);

  const isDirectory = draft.mode === 'create' ? draft.type === 'directory' : draft.isDirectory;

  function settle(action) {
    if (settled.current) {
      return;
    }

    settled.current = true;
    action();
  }

  function onChangeText(next) {
    setName(next);

    // Whatever the last commit complained about is stale the moment the name
    // changes. Nothing else here needs the tree to redraw.
    if (draft.error) {
      clearDraftError();
    }
  }

  // A rejected name leaves the field open to be fixed, so the guard has to lift
  // again — otherwise the second attempt would be ignored.
  function commit() {
    settle(() => {
      commitDraft(name).then(committed => {
        if (!committed) {
          settled.current = false;
        }
      });
    });
  }

  // Wired to both: macOS delivers Escape as a press, the web build as a down.
  function onCancelKey(event) {
    if ((event.nativeEvent ?? event).key === 'Escape') {
      settle(cancelDraft);
    }
  }

  return (
    <View>
      <View style={[styles.row, {paddingLeft: indentFor(depth)}]}>
        <View style={styles.gutter} />

        <FileIcon name={name || 'file'} isDirectory={isDirectory} isOpen={false} />

        <TextInput
          ref={input}
          style={styles.input}
          value={name}
          placeholder={isDirectory ? 'Folder name' : 'File name'}
          enableFocusRing={false}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          onChangeText={onChangeText}
          onKeyPress={onCancelKey}
          onKeyDown={onCancelKey}
          keyDownEvents={KEY_DOWN_EVENTS}
          onSubmitEditing={commit}
          onBlur={commit}
        />
      </View>

      {draft.error && <Text style={[styles.error, {paddingLeft: indentFor(depth) + GUTTER + 20}]}>{draft.error}</Text>}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    paddingRight: 4,
    height: 26,
    borderRadius: 6,
  },
  rowHovered: {
    backgroundColor: withAlpha(colors.onSurface, 0.06),
  },
  // Two different things worth showing: which file the editor has open, and
  // which row the keyboard is pointing at. The second is the louder of the two,
  // because it is the one about to be renamed or deleted.
  rowCurrent: {
    backgroundColor: withAlpha(colors.primary, 0.12),
  },
  rowSelected: {
    backgroundColor: withAlpha(colors.primary, 0.28),
  },
  gutter: {
    width: GUTTER,
  },
  name: {
    color: colors.onSurface,
    flexShrink: 1,
  },
  nameCurrent: {
    fontWeight: '600',
  },
  input: {
    flex: 1,
    marginLeft: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    color: colors.onSurface,
  },
  error: {
    color: colors.error,
    fontSize: 11,
    paddingTop: 2,
    paddingBottom: 2,
  },
});
