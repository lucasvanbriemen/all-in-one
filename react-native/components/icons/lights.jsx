import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function LightsIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path
        d="M9 17.4v-1.6c0-1-.5-1.8-1.2-2.6A6 6 0 1 1 16.2 13.2c-.7.8-1.2 1.6-1.2 2.6v1.6Z"
        stroke={color}
        {...strokeProps}
      />
      <Path d="M9.6 20.4h4.8" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
