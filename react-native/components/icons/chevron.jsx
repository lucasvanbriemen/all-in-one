import React from 'react';
import {Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

/** Points right when collapsed, down when expanded. */
export function ChevronIcon({size, color, open = false}) {
  return (
    <Glyph size={size}>
      <Path d={open ? 'm7 10 5 5 5-5' : 'm10 7 5 5-5 5'} stroke={color} {...strokeProps} />
    </Glyph>
  );
}
