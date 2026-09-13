import {Glyph} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function PlayIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path
        d="M8 6.6c0-1.15 1.26-1.85 2.23-1.23l8.08 5.4a1.46 1.46 0 0 1 0 2.46l-8.08 5.4A1.46 1.46 0 0 1 8 17.4z"
        fill={color}
      />
    </Glyph>
  );
}
