import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppContext = createContext();

// A generic key/value store shared across the app.
//   const { data, get, set } = useAppContext();
//   set('user', { name: 'Lucas' });
//   get('user');           // { name: 'Lucas' }
//   set('count', c => (c ?? 0) + 1);   // updater functions work too
export function AppProvider({ children, initialData = {} }) {
  const [data, setData] = useState(initialData);

  const get = useCallback(key => data[key], [data]);

  const set = useCallback((key, value) => {
    setData(prev => ({
      ...prev,
      [key]: typeof value === 'function' ? value(prev[key]) : value,
    }));
  }, []);

  const remove = useCallback(key => {
    setData(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const value = useMemo(() => ({ data, get, set, remove }), [data, get, set, remove]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
