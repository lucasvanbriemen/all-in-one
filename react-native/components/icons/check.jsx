import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function CheckIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M4 12.5 9 17.5 20 6.5" stroke={color} {...strokeProps} strokeWidth={2.2} />
    </Glyph>
  );
}
