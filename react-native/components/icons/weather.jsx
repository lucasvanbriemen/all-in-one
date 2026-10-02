import {Circle, Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

import React from 'react';

/**
 * Weather glyphs, keyed by the `main` field OpenWeatherMap returns
 * (Clear, Clouds, Rain, Drizzle, Thunderstorm, Snow, Mist, ...).
 * Same 24×24 grid and stroke weight as the sidebar set.
 */

// Shared cloud outline; the other glyphs hang precipitation beneath it.
const CLOUD = 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 11.5 3.3 3.3 0 0 0 7 18Z';

export function ClearIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Circle cx="12" cy="12" r="4" stroke={color} {...strokeProps} />
      <Path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"
        stroke={color}
        {...strokeProps}
      />
    </Glyph>
  );
}

export function CloudsIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d={CLOUD} stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function RainIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8.5 3.3 3.3 0 0 0 7 15Z" stroke={color} {...strokeProps} />
      <Path d="M9 18v3M13 18v3M17 18v3" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function DrizzleIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8.5 3.3 3.3 0 0 0 7 15Z" stroke={color} {...strokeProps} />
      <Path d="M9 18v1M13 18v1M17 18v1" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function ThunderstormIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7.5 3.3 3.3 0 0 0 7 14Z" stroke={color} {...strokeProps} />
      <Path d="m13 14-2.5 4h3L11 22" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function SnowIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8.5 3.3 3.3 0 0 0 7 15Z" stroke={color} {...strokeProps} />
      <Path d="M9 18.5h.01M13 18.5h.01M17 18.5h.01M11 21.5h.01M15 21.5h.01" stroke={color} {...strokeProps} strokeWidth={2.2} />
    </Glyph>
  );
}

// Mist, Fog, Haze, Smoke, Dust, Sand, Ash, Squall and Tornado all map here.
export function MistIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M4 9h16M6 13h14M4 17h12" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export const WEATHER_ICONS = {
  Clear: ClearIcon,
  Clouds: CloudsIcon,
  Rain: RainIcon,
  Drizzle: DrizzleIcon,
  Thunderstorm: ThunderstormIcon,
  Snow: SnowIcon,
  Mist: MistIcon,
  Fog: MistIcon,
  Haze: MistIcon,
  Smoke: MistIcon,
  Dust: MistIcon,
  Sand: MistIcon,
  Ash: MistIcon,
  Squall: MistIcon,
  Tornado: MistIcon,
};

export function WeatherIcon({condition, size, color}) {
  const IconToRender = WEATHER_ICONS[condition] ?? CloudsIcon;

  return <IconToRender size={size} color={color} />;
}
