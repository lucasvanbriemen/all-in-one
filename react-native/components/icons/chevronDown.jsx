import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function HomeIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M3.2 11 12 3.6 20.8 11" stroke={color} {...strokeProps} />
      <Path d="M5.4 9.6V19a1.4 1.4 0 0 0 1.4 1.4h10.4a1.4 1.4 0 0 0 1.4-1.4V9.6" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
