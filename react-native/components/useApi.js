import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {api} from './api';

// Shared by every component: the last response per URL, and who is showing it.
const cache = new Map(); // url -> data
const listeners = new Map(); // url -> Set of setState functions

// Bump the version when a response's shape changes, so old saved data is ignored.
const STORAGE_KEY = 'api-cache-v1';

function notify(url, data) {
  listeners.get(url)?.forEach(listener => listener(data));
}

// On launch, load what the previous session saved and show it right away.
// A response that already came in from the network is newer, so it wins.
AsyncStorage.getItem(STORAGE_KEY)
  .then(json => {
    Object.entries(JSON.parse(json || '{}')).forEach(([url, data]) => {
      if (cache.has(url)) return;
      cache.set(url, data);
      notify(url, data);
    });
  })
  .catch(() => {});

// Several responses often land together, so write once, shortly after the last one.
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(cache))).catch(() => {});
  }, 1000);
}

// Fetches a URL, remembers the answer, and hands it to everyone showing that URL.
function refresh(url) {
  return api.get(url).then(data => {
    cache.set(url, data);
    notify(url, data);
    save();
    return data;
  });
}

// Stale-while-revalidate: returns the remembered data straight away (undefined
// the very first time), fetches in the background, and re-renders when it lands.
export function useApi(url) {
  const [data, setData] = useState(cache.get(url));

  useEffect(() => {
    if (!listeners.has(url)) listeners.set(url, new Set());
    listeners.get(url).add(setData);

    setData(cache.get(url));
    refresh(url).catch(() => {}); // on failure, keep showing the old data

    return () => listeners.get(url).delete(setData);
  }, [url]);

  return {data, refresh: () => refresh(url)};
}
