import {useEffect, useState} from 'react';

import {api} from '../api';
import {dateQuery} from './season';

/**
 * The seasonal endpoints, each fetched once per launch and shared — the snow,
 * the frost and the greeting all want the weather, and the email list and the
 * Naughty & Nice card both want the naughty list.
 */
const cache = new Map();

export function fetchSeasonal(path, {fresh = false} = {}) {
  if (fresh || !cache.has(path)) {
    const query = dateQuery();
    const separator = path.includes('?') ? '&' : '?';
    const url = query ? path + separator + query.slice(1) : path;
    cache.set(path, api.get(url).catch(error => {
      cache.delete(path);
      throw error;
    }));
  }
  return cache.get(path);
}

/** `[data, reload]` for a seasonal endpoint; data is null until it lands (or if it fails). */
export function useSeasonalData(path, enabled = true) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchSeasonal(path).then(result => !cancelled && setData(result)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [path, enabled]);

  const reload = () => fetchSeasonal(path, {fresh: true}).then(setData).catch(() => {});

  return [data, reload];
}

/**
 * Today's weather, reduced to what the decorations care about. The condition
 * strings come from the server's forecast ("Snow", "Light rain", "Drizzle"…);
 * the temperature is whatever `feels_like` says, digits pulled out.
 */
export function describeWeather(weather) {
  const condition = String(weather?.condition ?? '');
  const temperature = parseFloat(String(weather?.feels_like ?? '').replace(',', '.').match(/-?\d+(\.\d+)?/)?.[0]);

  let kind = 'clear';
  if (/snow|sleet|blizzard|sneeuw/i.test(condition)) kind = 'snow';
  else if (/rain|drizzle|shower|thunder|regen|motregen/i.test(condition)) kind = 'rain';

  return {kind, temperature: Number.isFinite(temperature) ? temperature : null};
}

export function useWeather() {
  const [weather] = useSeasonalData('/weather');
  return describeWeather(weather);
}
