import { useCallback, useEffect, useReducer, useRef } from 'react';

/**
 * App-wide state, kept outside React.
 *
 * It used to live in a context `useState`, which re-rendered every consumer —
 * and through AppShell, the whole tree — on every `set`. Now each component
 * that calls `useAppContext()` only re-renders when a key it read during its
 * last render changes. `setIn` copies just the path it writes, so an unchanged
 * key keeps its identity and a `!==` check is enough to tell.
 */

const toPath = key => (Array.isArray(key) ? key : String(key).split('.'));

function getIn(obj, path) {
  return path.reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

// Returns a new object with the value at `path` replaced (immutable update).
function setIn(obj, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const current = obj != null && typeof obj === 'object' ? obj : {};
  return { ...current, [head]: setIn(current[head], rest, value) };
}

function removeIn(obj, path) {
  if (obj == null || typeof obj !== 'object') return obj;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    const { [head]: _, ...remaining } = obj;
    return remaining;
  }
  return { ...obj, [head]: removeIn(obj[head], rest) };
}

let state = {};
const listeners = new Set();

function update(next) {
  if (next === state) return;
  state = next;
  listeners.forEach(listener => listener());
}

export const store = {
  get: key => getIn(state, toPath(key)),

  set(key, value) {
    const path = toPath(key);
    update(setIn(state, path, typeof value === 'function' ? value(getIn(state, path)) : value));
  },

  remove(key) {
    update(removeIn(state, toPath(key)));
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Kept so App.jsx and tests can seed state; it no longer holds any itself. */
export function AppProvider({ children, initialData }) {
  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    if (initialData) state = initialData;
  }
  return children;
}

/**
 * `get`, `set` and `remove` are stable across renders, and `get` always reads
 * the latest state — also inside callbacks and effects. Don't use `get` as an
 * effect dependency to mean "something changed"; read the value in render and
 * depend on that instead.
 */
export function useAppContext() {
  const [, rerender] = useReducer(n => n + 1, 0);

  // Keys this component read, and what it saw. Re-recorded on every render.
  const seen = useRef(null);
  if (seen.current === null) seen.current = new Map();
  seen.current.clear();

  const get = useCallback(key => {
    const value = store.get(key);
    seen.current.set(Array.isArray(key) ? key.join('.') : String(key), value);
    return value;
  }, []);

  useEffect(() => {
    const check = () => {
      for (const [key, value] of seen.current) {
        if (store.get(key) !== value) {
          rerender();
          return;
        }
      }
    };

    const unsubscribe = store.subscribe(check);
    // Children's effects run before ours; catch anything they set in between.
    check();
    return unsubscribe;
  }, []);

  return { get, set: store.set, remove: store.remove };
}
