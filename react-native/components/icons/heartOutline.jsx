import {Glyph, strokeProps} from './glyph';
import {HEART_PATH} from './heart';

import {Path} from 'react-native-svg';
import React from 'react';

export function HeartOutlineIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d={HEART_PATH} stroke={color} {...strokeProps} />
    </Glyph>
  );
}
