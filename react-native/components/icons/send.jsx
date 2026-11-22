import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function SendIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M12 19 L12 5.5" stroke={color} {...strokeProps} strokeWidth={2.4} />
      <Path d="M6 11 L12 5 L18 11" stroke={color} {...strokeProps} strokeWidth={2.4} />
    </Glyph>
  );
}
