import {Pressable, StyleSheet, Text, View} from 'react-native';
import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

const ToastContext = createContext(null);

const DURATION = {info: 4000, success: 3000, error: 8000};

/**
 * Feedback for things that happen off-screen: a failed save, a finished
 * replace, a server that went away. Errors linger; the rest fade. A toast may
 * carry one action, which is how the conflict prompt offers "reload".
 */
export function ToastProvider({children}) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback(id => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const show = useCallback(
    (message, {kind = 'info', action = null, sticky = false} = {}) => {
      const id = ++counter.current;
      const toast = {id, message: String(message), kind, action};

      setToasts(current => [...current.slice(-4), toast]);

      if (!sticky) {
        setTimeout(() => dismiss(id), DURATION[kind] ?? DURATION.info);
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({show, dismiss}), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  // Outside a provider — in a test, say — a toast is a log line.
  return context ?? {show: message => console.log(`[toast] ${message}`), dismiss: () => {}};
}

function ToastStack({toasts, onDismiss}) {
  const styles = useThemedStyles(createStyles);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.stack}>
      {toasts.map(toast => (
        <View key={toast.id} style={[styles.toast, styles[toast.kind]]} testID={`toast-${toast.kind}`}>
          <Text style={styles.message} numberOfLines={4}>{toast.message}</Text>

          {toast.action && (
            <Pressable
              onPress={() => {
                toast.action.onPress();
                onDismiss(toast.id);
              }}
              style={styles.action}>
              <Text style={styles.actionText}>{toast.action.label}</Text>
            </Pressable>
          )}

          <Pressable onPress={() => onDismiss(toast.id)} style={styles.close} accessibilityLabel="Dismiss">
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 8,
    maxWidth: 420,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...glass(colors, {variant: 'surface'}),
  },
  info: {},
  success: {borderColor: colors.primary},
  error: {borderColor: colors.error ?? '#d33'},
  message: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
  },
  action: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    ...glass(colors, {variant: 'accent'}),
  },
  actionText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  close: {
    paddingHorizontal: 4,
  },
  closeText: {
    color: colors.onSurfaceVariant,
    fontSize: 16,
  },
});
