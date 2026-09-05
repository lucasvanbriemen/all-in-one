import {Circle, Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

import React from 'react';

export function CutIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Circle cx="6.4" cy="18" r="2.8" stroke={color} {...strokeProps} />
      <Circle cx="17.6" cy="18" r="2.8" stroke={color} {...strokeProps} />
      <Path d="M8.4 15.8 17.2 3.4M15.6 15.8 6.8 3.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
