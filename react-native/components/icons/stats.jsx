import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function StatsIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M4 20h16" stroke={color} {...strokeProps} />
      <Path d="M6.5 16v-5M12 16V5M17.5 16v-8" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
