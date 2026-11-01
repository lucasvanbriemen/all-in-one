import {Platform} from 'react-native';

import {isCozy, isDecorated, isGrinchDay, phaseOf, seasonYear, useNow} from './season';
import {usePersisted} from './store';

/**
 * Where the Grinch hides the ornaments. Code only exists on the Mac, so on
 * the phone there is one fewer to find.
 */
export function ornamentSpots() {
  const spots = ['email', 'music', 'money', 'messages'];
  if (Platform.OS === 'macos') spots.push('code');
  return spots;
}

export const grinchKey = year => `grinch.${year}.found`;

/**
 * The season as a component sees it. `decorated` is what most decorations
 * check: in season, and the Grinch isn't holding Christmas hostage.
 */
export function useSeason(intervalMs = 60_000) {
  const date = useNow(intervalMs);
  const year = seasonYear(date);
  const found = usePersisted(grinchKey(year), []);
  const grinchActive = isGrinchDay(date) && ornamentSpots().some(spot => !found.includes(spot));

  return {
    date,
    year,
    phase: phaseOf(date),
    decorated: isDecorated(date) && !grinchActive,
    cozy: isCozy(date) && !grinchActive,
    grinchActive,
  };
}
