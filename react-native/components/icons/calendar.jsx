import {Glyph, strokeProps} from './glyph';
import {Path, Rect} from 'react-native-svg';

import React from 'react';

export function CalendarIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Rect x="3.4" y="5" width="17.2" height="15.4" rx="2.4" stroke={color} {...strokeProps} />
      <Path d="M3.4 9.6h17.2M8 3.2v3.6M16 3.2v3.6" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
