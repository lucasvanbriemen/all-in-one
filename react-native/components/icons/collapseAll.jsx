import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function CollapseAllIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M5.6 11.6 12 5.2l6.4 6.4" stroke={color} {...strokeProps} />
      <Path d="M5.6 18.8 12 12.4l6.4 6.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
