import {christmasMusicShare, isoDay, now} from './season';
import {getPersisted, loadPersisted, setPersisted} from './store';

import {fetchSeasonal} from './data';

/**
 * More and more Christmas music the closer it gets.
 *
 * When a playlist is shuffled, each slot in the queue has a chance of being a
 * Christmas song instead — 1% on 1 November, about a third by mid-December,
 * everything from Christmas Eve to Boxing Day, nothing from the 27th. The
 * songs come from the server: your "Christmas" playlist, or failing that a
 * title scan of the library.
 *
 * The level can be nudged for the day from the meter on the Now Playing card.
 */
export const BOOST_MODES = ['auto', 'more', 'max', 'off'];
const BOOST_KEY = 'music.boost';

export function boostMode(date = now()) {
  const boost = getPersisted(BOOST_KEY, null);
  return boost?.day === isoDay(date) ? boost.mode : 'auto';
}

export function cycleBoost(date = now()) {
  const next = BOOST_MODES[(BOOST_MODES.indexOf(boostMode(date)) + 1) % BOOST_MODES.length];
  setPersisted(BOOST_KEY, {day: isoDay(date), mode: next});
  return next;
}

export function effectiveShare(date = now(), mode = boostMode(date)) {
  const base = christmasMusicShare(date);
  if (mode === 'off') return 0;
  if (mode === 'max') return 1;
  if (mode === 'more') return Math.min(1, base + 0.25);
  return base;
}

function shuffled(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Waits at most `ms` for the Christmas songs, so pressing play never hangs on them. */
function within(promise, ms) {
  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Mixes Christmas songs into a shuffled queue. Songs already in the queue (or
 * the one about to play) aren't added twice; Christmas songs are tagged with
 * `christmas: true` so the player UI can tell.
 */
export async function mixChristmas(queue, {exclude = []} = {}) {
  await within(loadPersisted(), 800);
  const share = effectiveShare();
  if (share <= 0) return queue;

  const songs = await within(fetchSeasonal('/seasonal/christmas_songs').catch(() => null), 1500);
  if (!Array.isArray(songs) || songs.length === 0) return queue;

  const taken = new Set([...queue.map(song => song.id), ...exclude]);
  const pool = shuffled(songs.filter(song => !taken.has(song.id))).map(song => ({...song, christmas: true}));
  const alreadyChristmas = new Set(songs.map(song => song.id));
  const tagged = queue.map(song => (alreadyChristmas.has(song.id) ? {...song, christmas: true} : song));

  if (share >= 1) {
    // Nothing but Christmas: whatever was in the queue that's festive, plus the pool.
    const festive = shuffled([...tagged.filter(song => song.christmas), ...pool]);
    return festive.length ? festive : tagged;
  }

  const mixed = [];
  let regular = 0;
  while (regular < tagged.length) {
    if (pool.length && Math.random() < share) {
      mixed.push(pool.pop());
    } else {
      mixed.push(tagged[regular++]);
    }
  }
  return mixed;
}
