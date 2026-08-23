import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function ChevronDown({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M3.2 11 12 19.4 20.8 11" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
