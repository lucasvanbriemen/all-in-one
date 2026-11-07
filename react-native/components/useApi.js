import { api } from './api';

const cache = new Map();

export function fetchCached(url, maxAge = 30 * 1000) {
  const entry = cache.get(url);

  if (entry && Date.now() - entry.fetchedAt < maxAge) {
    return entry.data;
  }

  return api.get(url).then(data => {
    cache.set(url, { data, fetchedAt: Date.now() });
    return data;
  });
}