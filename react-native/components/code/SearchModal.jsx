import {Pressable, StyleSheet, Text, View} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useCallback, useEffect, useRef} from 'react';

// Claimed so macOS stops handling these itself; the events reach JS either way.
const KEY_DOWN_EVENTS = [{key: 'Escape'}, {key: 'p', metaKey: true}];

export function SearchModal({projectRoot, folder, onOpenFile, onClose, itemsDeep}) {
  const styles = useThemedStyles(createStyles);
  const overlay = useRef(null);

  // Opened from the editor, focus is still inside Monaco's WebView, which eats
  // every key it is given — Escape included. Taking focus here is what makes
  // the modal closable, and later what will let the search field be typed in.
  useEffect(() => {
    overlay.current?.focus?.();
  }, []);

  const onKeyDown = useCallback(
    event => {
      if ((event.nativeEvent ?? event).key === 'Escape') {
        onClose?.();
      }
    },
    [onClose],
  );

  return (
    <View ref={overlay} focusable enableFocusRing={false} style={styles.overlay} onKeyDown={onKeyDown} keyDownEvents={KEY_DOWN_EVENTS}>
      <Pressable style={styles.overlay} onPress={onClose} />

      <View style={styles.panel}>
        <Text style={styles.label}>Search Modal</Text>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  // Filled absolutely rather than by `flex`, so the row it sits in gives it no
  // track of its own and it covers the tree and the editor both.
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  panel: {
    minWidth: 500,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    ...glass(colors, {tint: 0.75, tone: "surfaceAt1"}),
    top: 64,
  }
});
