import {useCallback, useSyncExternalStore} from 'react';

import {api} from '../api';
import {dateQuery} from './season';

/**
 * Seasonal state lives outside AppContext on purpose: snow and lights update
 * many times a second, and every AppContext write re-renders the whole app.
 *
 * Two kinds of thing are kept here:
 *  - `persisted`: small bits that have to survive a restart and follow you
 *    between Mac and phone (opened advent doors, ornaments found, the gift
 *    list). Mirrored to the server's /seasonal/state, one key per write.
 *  - `effects`: fire-and-forget moments (a snow burst, a blizzard, a toast)
 *    that the overlay layer plays.
 */
let state = {persisted: {}, loaded: false, toast: null, blizzardUntil: 0, yearInReview: null};
const listeners = new Set();
const effectListeners = new Set();

function emitChange() {
  listeners.forEach(listener => listener());
}

function setState(patch) {
  state = {...state, ...patch};
  emitChange();
}

let loadPromise;

export function loadPersisted() {
  loadPromise ??= api
    .get('/seasonal/state' + dateQuery())
    .then(persisted => setState({persisted: persisted ?? {}, loaded: true}))
    .catch(() => setState({loaded: true}));
  return loadPromise;
}

export function getPersisted(key, fallback) {
  return state.persisted[key] ?? fallback;
}

export function setPersisted(key, value) {
  setState({persisted: {...state.persisted, [key]: value}});
  api.post('/seasonal/state', {key, value}).catch(() => {});
}

export function useSeasonalState(selector) {
  return useSyncExternalStore(
    useCallback(listener => {
      listeners.add(listener);
      loadPersisted();
      return () => listeners.delete(listener);
    }, []),
    () => selector(state),
  );
}

export function usePersisted(key, fallback) {
  const value = useSeasonalState(s => s.persisted[key]);
  return value ?? fallback;
}

export function showToast(toast) {
  setState({toast: {...toast, id: Date.now()}});
}

export function dismissToast() {
  setState({toast: null});
}

/** Door 24 opens full-window, over everything. */
export function showYearInReview(door) {
  setState({yearInReview: door});
}

export function hideYearInReview() {
  setState({yearInReview: null});
}

export function startBlizzard(seconds = 10) {
  setState({blizzardUntil: Date.now() + seconds * 1000});
}

/** A one-off effect for the overlay: {type: 'burst' | 'fireworks', x?, y?}. */
export function playEffect(effect) {
  effectListeners.forEach(listener => listener(effect));
}

export function onEffect(listener) {
  effectListeners.add(listener);
  return () => effectListeners.delete(listener);
}
