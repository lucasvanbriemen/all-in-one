import {Circle, Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

import React from 'react';

export function OverviewIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M16.6 7.4V5.2a1.2 1.2 0 0 0-1.5-1.2L4.8 6.6" stroke={color} {...strokeProps} />
      <Path
        d="M3.4 8.2a1.4 1.4 0 0 1 1.4-1.4h14.4a1.4 1.4 0 0 1 1.4 1.4v10.4a1.4 1.4 0 0 1-1.4 1.4H4.8a1.4 1.4 0 0 1-1.4-1.4Z"
        stroke={color}
        {...strokeProps}
      />
      <Path d="M20.6 11.2h-3.8a2.2 2.2 0 0 0 0 4.4h3.8" stroke={color} {...strokeProps} />
      <Circle cx="16.8" cy="13.4" r="0.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
