import {Glyph, strokeProps} from './glyph';

import {Circle, Path} from 'react-native-svg';
import React from 'react';

export function ClockIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Circle cx="12" cy="12" r="8.5" stroke={color} {...strokeProps} strokeWidth={2} />
      <Path d="M12 7.5V12l3 2" stroke={color} {...strokeProps} strokeWidth={2} />
    </Glyph>
  );
}
