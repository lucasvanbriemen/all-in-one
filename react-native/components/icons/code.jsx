import React from 'react';
import {Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

export function CodeIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="m8.5 7-5 5 5 5" stroke={color} {...strokeProps} />
      <Path d="m15.5 7 5 5-5 5" stroke={color} {...strokeProps} />
      <Path d="m13.5 4-3 16" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
