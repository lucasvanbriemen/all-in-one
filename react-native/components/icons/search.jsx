import {Circle, Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

import React from 'react';

export function SearchIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Circle cx="10.6" cy="10.6" r="6.8" stroke={color} {...strokeProps} />
      <Path d="m15.6 15.6 4.6 4.6" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
