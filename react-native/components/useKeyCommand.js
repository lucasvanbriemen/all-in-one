import {useEffect, useRef} from 'react';
import {NativeEventEmitter, NativeModules} from 'react-native';

// App-wide keyboard shortcuts on macOS, backed by the KeyCommands native
// module (macos/AllInOne-macOS/KeyCommands.swift). Elsewhere it's a no-op.
//
//   useKeyCommand(['meta', 'k'], () => openSearch());
//
// Modifiers: meta (⌘), ctrl, alt (⌥), shift. The key is the character
// without modifiers, e.g. 'k', '/', ','.

const {KeyCommands} = NativeModules;
const handlers = new Map(); // combo -> Set of callbacks
let subscription = null;

const MODIFIERS = ['meta', 'ctrl', 'alt', 'shift'];

// Must produce the same string as KeyCommands.combo(for:).
function normalizeCombo(keys) {
  const lower = keys.map(key => key.toLowerCase());
  const modifiers = MODIFIERS.filter(modifier => lower.includes(modifier));
  const key = lower.find(part => !MODIFIERS.includes(part)) ?? '';
  return [...modifiers, key].join('+');
}

function sync() {
  KeyCommands.setCommands([...handlers.keys()]);

  if (handlers.size > 0 && !subscription) {
    subscription = new NativeEventEmitter(KeyCommands).addListener('keyCommand', ({combo}) => {
      handlers.get(combo)?.forEach(handler => handler());
    });
  } else if (handlers.size === 0 && subscription) {
    subscription.remove();
    subscription = null;
  }
}

export function useKeyCommand(keys, callback) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const combo = normalizeCombo(keys);

  useEffect(() => {
    if (!KeyCommands) return undefined;

    const handler = () => callbackRef.current();
    if (!handlers.has(combo)) handlers.set(combo, new Set());
    handlers.get(combo).add(handler);
    sync();

    return () => {
      const set = handlers.get(combo);
      set.delete(handler);
      if (set.size === 0) handlers.delete(combo);
      sync();
    };
  }, [combo]);
}
