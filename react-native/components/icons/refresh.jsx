import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function RefreshIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M20.2 11.4a8.2 8.2 0 1 1-2.4-5.6" stroke={color} {...strokeProps} />
      <Path d="M20.4 3.2v4.8h-4.8" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
