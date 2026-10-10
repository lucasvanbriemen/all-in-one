import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function CheckDoubleIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M1.5 12.5 6.5 17.5 17.5 6.5" stroke={color} {...strokeProps} strokeWidth={2.2} />
      <Path d="M11.5 17.5 22.5 6.5" stroke={color} {...strokeProps} strokeWidth={2.2} />
    </Glyph>
  );
}
