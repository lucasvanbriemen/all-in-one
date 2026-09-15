import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function CrossIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M6 6 L18 18" stroke={color} {...strokeProps} strokeWidth={2.4} />
      <Path d="M6 18 L18 6" stroke={color} {...strokeProps} strokeWidth={2.4} />
    </Glyph>
  );
}
