import {Circle, Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

import React from 'react';

export function SunIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Circle cx="12" cy="12" r="4" stroke={color} {...strokeProps} />
      <Path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function CloudIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M7 18.5a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 9.6 4.2 4.2 0 0 1 17 18.5H7Z" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function RainIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M7 15.5a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 6.6 4.2 4.2 0 0 1 17 15.5H7Z" stroke={color} {...strokeProps} />
      <Path d="M8.5 18.5v2.5M12 18.5v2.5M15.5 18.5v2.5" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function SnowIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M12 3.5v17M4.6 7.75l14.8 8.5M4.6 16.25l14.8-8.5" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function StormIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M7 14.5a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17.2 5.6 4.2 4.2 0 0 1 17 14.5h-1" stroke={color} {...strokeProps} />
      <Path d="M12.5 11.5 10 16h3.5L11.5 20.5" stroke={color} {...strokeProps} />
    </Glyph>
  );
}

export function MoonIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.5 7.5 0 1 0 9.7 9.7Z" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
