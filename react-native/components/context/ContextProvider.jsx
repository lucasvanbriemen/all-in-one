import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

// A single provider that acts as a key/value registry of many small "contexts".
// Any component can read or write a slot by name, and slots survive unmounts
// (e.g. switching applications) for as long as the provider lives.
//
//   const [selectedEmail, setSelectedEmail] = useAppContext('email.selected');
//   const {get, set, remove, reset} = useContextStore();
const ContextStore = createContext(null);

export function ContextProvider({children, initial = {}}) {
  const [store, setStore] = useState(initial);

  const get = useCallback((key, fallback) => (key in store ? store[key] : fallback), [store]);

  const set = useCallback((key, value) => {
    setStore(prev => {
      const next = typeof value === 'function' ? value(prev[key]) : value;
      if (prev[key] === next) return prev;
      return {...prev, [key]: next};
    });
  }, []);

  const remove = useCallback(key => {
    setStore(prev => {
      if (!(key in prev)) return prev;
      const {[key]: _removed, ...rest} = prev;
      return rest;
    });
  }, []);

  const reset = useCallback(() => setStore(initial), [initial]);

  const value = useMemo(() => ({store, get, set, remove, reset}), [store, get, set, remove, reset]);

  return <ContextStore.Provider value={value}>{children}</ContextStore.Provider>;
}

export function useContextStore() {
  const ctx = useContext(ContextStore);
  if (!ctx) throw new Error('useContextStore must be used inside <ContextProvider>');
  return ctx;
}

// useState-like access to one slot in the registry.
export function useAppContext(key, fallback = null) {
  const {get, set} = useContextStore();
  const setValue = useCallback(value => set(key, value), [set, key]);
  return [get(key, fallback), setValue];
}
