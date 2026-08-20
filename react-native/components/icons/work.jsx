import {Glyph, strokeProps} from './glyph';
import {Path, Rect} from 'react-native-svg';

import React from 'react';

export function WorkIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Rect x="2.8" y="7.4" width="18.4" height="12.6" rx="2.4" stroke={color} {...strokeProps} />
      <Path d="M8.8 7.4V5.8A1.8 1.8 0 0 1 10.6 4h2.8a1.8 1.8 0 0 1 1.8 1.8v1.6" stroke={color} {...strokeProps} />
      <Path d="M2.8 13.2h18.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
