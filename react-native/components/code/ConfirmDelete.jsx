import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';

import {useEffect, useRef} from 'react';
import {useFileTree} from './fileTreeContext';

const KEY_DOWN_EVENTS = [{key: 'Escape'}, {key: 'Enter'}];

/**
 * Deleting here is a real delete — the server has no Finder trash to hand the
 * entry to — so the dialog says as much rather than implying an undo that does
 * not exist. Escape cancels, Return confirms.
 */
export function ConfirmDelete() {
  const styles = useThemedStyles(createStyles);
  const {pendingDelete, confirmDelete, cancelDelete} = useFileTree();
  const panel = useRef(null);

  useEffect(() => {
    panel.current?.focus?.();
  }, []);

  function onKeyDown(event) {
    const {key} = event.nativeEvent ?? event;

    if (key === 'Escape') {
      cancelDelete();
    }

    if (key === 'Enter') {
      confirmDelete();
    }
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={cancelDelete} />

      <View ref={panel} focusable enableFocusRing={false} style={styles.panel} onKeyDown={onKeyDown} keyDownEvents={KEY_DOWN_EVENTS}>
        <Text style={styles.title}>Delete {pendingDelete.name}?</Text>

        <Text style={styles.body}>
          {pendingDelete.isDirectory
            ? 'The folder and everything in it is deleted from disk. This cannot be undone.'
            : 'The file is deleted from disk. This cannot be undone.'}
        </Text>

        <View style={styles.buttons}>
          <Pressable style={styles.cancel} onPress={cancelDelete}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Pressable style={styles.confirm} onPress={confirmDelete}>
            <Text style={styles.confirmText}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The tree is a narrow column, and this sits inside it, so the panel takes
  // the width it is given rather than asking for a dialog's worth of it.
  panel: {
    alignSelf: 'stretch',
    maxWidth: 420,
    marginHorizontal: 8,
    padding: 16,
    borderRadius: 16,
    gap: 8,
    ...glass(colors, {tint: 0.95}),
    backgroundColor: colors.surfaceAt2,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 20},
    shadowOpacity: 0.4,
    shadowRadius: 60,
  },
  title: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  body: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  cancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 90,
    ...glass(colors, {tint: 0.5}),
  },
  cancelText: {
    color: colors.onSurface,
  },
  confirm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 90,
    backgroundColor: colors.error,
  },
  confirmText: {
    color: colors.onError,
    fontWeight: '600',
  },
});
