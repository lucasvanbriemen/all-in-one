import { api } from './api';

const cache = new Map();

const DEFAULT_CACHE_AGE_MINUTES = 30; // default cache age in minutes

export function fetchCached(url, maxAge = DEFAULT_CACHE_AGE_MINUTES, forceRefresh = false) {
  const entry = cache.get(url);

  const maxAgeMs = maxAge * 60 * 1000;

  if (!forceRefresh && entry && Date.now() - entry.fetchedAt < maxAgeMs) {
    return entry.data;
  }

  return api.get(url).then(data => {
    cache.set(url, { data, fetchedAt: Date.now() });
    return data;
  });
}