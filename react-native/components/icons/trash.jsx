import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function TrashIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M3.8 6.4h16.4" stroke={color} {...strokeProps} />
      <Path d="M9.4 6.4V4.2a1 1 0 0 1 1-1h3.2a1 1 0 0 1 1 1v2.2" stroke={color} {...strokeProps} />
      <Path d="M6.2 6.4 7.3 20a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9l1.1-13.6" stroke={color} {...strokeProps} />
      <Path d="M10.4 10.2v6.8M13.6 10.2v6.8" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
