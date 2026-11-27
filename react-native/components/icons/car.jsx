import {Glyph, strokeProps} from './glyph';

import {Circle, Path} from 'react-native-svg';
import React from 'react';

export function CarIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M5 16H4v-4l2-5h12l2 5v4h-1M9 16h6M4 12h16" stroke={color} {...strokeProps} />
      <Circle cx="7" cy="16" r="2" stroke={color} {...strokeProps} />
      <Circle cx="17" cy="16" r="2" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
