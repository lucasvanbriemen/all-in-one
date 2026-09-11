import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppContext = createContext();

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

export function AppProvider({ children, initialData = {} }) {
  const [data, setData] = useState(initialData);

  const get = useCallback(key => getIn(data, toPath(key)), [data]);

  const set = useCallback((key, value) => {
    const path = toPath(key);
    setData(prev =>
      setIn(prev, path, typeof value === 'function' ? value(getIn(prev, path)) : value),
    );
  }, []);

  const remove = useCallback(key => {
    setData(prev => removeIn(prev, toPath(key)));
  }, []);

  const value = useMemo(() => ({ data, get, set, remove }), [data, get, set, remove]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
