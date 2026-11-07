import {useEffect, useState} from 'react';

/**
 * The calendar the seasonal decorations run on.
 *
 * Everything seasonal asks this file what time it is rather than `new Date()`,
 * so the whole season can be previewed out of season: set PREVIEW_DATE to a
 * moment and the app starts there, with the clock running on from it.
 *
 *   '2026-12-03T09:00'  advent, a few doors open
 *   '2026-12-24T22:30'  the fireplace, in cozy mode
 *   '2026-12-31T23:59:30' the countdown, then fireworks
 *
 * Only honoured in development builds.
 */
export const PREVIEW_DATE = null //'2026-12-21T09:00';

const launchedAt = Date.now();
const previewStart = PREVIEW_DATE ? new Date(PREVIEW_DATE).getTime() : null;

export function now() {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && previewStart != null) {
    return new Date(previewStart + (Date.now() - launchedAt));
  }
  return new Date();
}

export const isPreviewing = () => typeof __DEV__ !== 'undefined' && __DEV__ && previewStart != null;

/** `?date=YYYY-MM-DD` for the seasonal endpoints, so the server agrees on "today" while previewing. */
export function dateQuery(date = now()) {
  if (!isPreviewing()) return '';
  return `?date=${isoDay(date)}`;
}

export function isoDay(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Where in the season a moment falls:
 *
 *   pre       1–30 Nov    only the Christmas music creeps in
 *   advent    1–23 Dec    decorations, advent calendar
 *   christmas 24–26 Dec   the fireplace takes over Home
 *   between   27–30 Dec
 *   nye       31 Dec      countdown instead of the greeting
 *   newyear   1–6 Jan     fireworks just after midnight, then packing up
 */
export function phaseOf(date = now()) {
  const month = date.getMonth();
  const day = date.getDate();

  if (month === 10) return 'pre';
  if (month === 0) return day <= 6 ? 'newyear' : null;
  if (month !== 11) return null;
  if (day <= 23) return 'advent';
  if (day <= 26) return 'christmas';
  if (day <= 30) return 'between';
  return 'nye';
}

/** Nov–Dec belong to their own year, the first week of January to the one before. */
export function seasonYear(date = now()) {
  return date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
}

const DECORATED = new Set(['advent', 'christmas', 'between', 'nye', 'newyear']);

export function isDecorated(date = now()) {
  return DECORATED.has(phaseOf(date));
}

/** After ten, before six: the lights go warm and the window glows. */
export function isCozy(date = now()) {
  const hour = date.getHours();
  return isDecorated(date) && (hour >= 22 || hour < 6);
}

/** Midnight on New Year's, for half an hour. */
export function isFireworksTime(date = now()) {
  return date.getMonth() === 0 && date.getDate() === 1 && date.getHours() === 0 && date.getMinutes() < 30;
}

/**
 * The share of shuffled songs that should be Christmas songs.
 *
 * A sneaky one now and then from 1 November, building through December,
 * nothing else from Christmas Eve to Boxing Day, and a hard stop on the 27th.
 */
const MUSIC_CURVE = [
  // [day of season (1 Nov = 1, 1 Dec = 31), share]
  [1, 0.01],
  [31, 0.1],
  [45, 0.3],
  [53, 0.6],
];

export function christmasMusicShare(date = now()) {
  const phase = phaseOf(date);
  if (phase === 'christmas') return 1;
  if (phase !== 'pre' && phase !== 'advent') return 0;

  const seasonDay = date.getMonth() === 10 ? date.getDate() : 30 + date.getDate();

  for (let i = 1; i < MUSIC_CURVE.length; i++) {
    const [toDay, toShare] = MUSIC_CURVE[i];
    const [fromDay, fromShare] = MUSIC_CURVE[i - 1];
    if (seasonDay <= toDay) {
      return fromShare + ((seasonDay - fromDay) / (toDay - fromDay)) * (toShare - fromShare);
    }
  }
  return MUSIC_CURVE[MUSIC_CURVE.length - 1][1];
}

/** The day the Grinch comes: somewhere between 3 and 21 December, the same day all year. */
export function grinchDay(year) {
  let hash = 2166136261;
  for (const char of `grinch-${year}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return 3 + (Math.abs(hash) % 19);
}

export function isGrinchDay(date = now()) {
  return phaseOf(date) === 'advent' && date.getDate() === grinchDay(date.getFullYear());
}

/** Kept in step with the server's list in Seasonal — what counts as wishing someone a merry Christmas. */
export const FESTIVE_PATTERN = /(merry|happy) (christmas|xmas|holidays)|fijne (feestdagen|kerst)|prettige feestdagen|vrolijk kerstfeest|gezellige kerst|zalig kerstfeest|🎄|🎅/i;

/**
 * The current moment, re-rendering every `intervalMs`. Components that only
 * care about the day can tick slowly; the New Year countdown ticks every second.
 */
export function useNow(intervalMs = 60_000) {
  const [date, setDate] = useState(now);

  useEffect(() => {
    const timer = setInterval(() => setDate(now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return date;
}

export function daysUntil(target, from = now()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end - start) / 86_400_000);
}
