import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function CopyIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M9.4 8.6h9.2a1.4 1.4 0 0 1 1.4 1.4v9.2a1.4 1.4 0 0 1-1.4 1.4H9.4A1.4 1.4 0 0 1 8 19.2V10a1.4 1.4 0 0 1 1.4-1.4z" stroke={color} {...strokeProps} />
      <Path d="M16 5.6V4.8a1.4 1.4 0 0 0-1.4-1.4H5.4A1.4 1.4 0 0 0 4 4.8V14a1.4 1.4 0 0 0 1.4 1.4h.8" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
