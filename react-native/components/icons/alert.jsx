import {Glyph, strokeProps} from './glyph';

import {Circle, Path} from 'react-native-svg';
import React from 'react';

export function AlertIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Circle cx="12" cy="12" r="9" stroke={color} {...strokeProps} strokeWidth={2} />
      <Path d="M12 7v6" stroke={color} {...strokeProps} strokeWidth={2.2} />
      <Circle cx="12" cy="16.5" r="1.2" fill={color} />
    </Glyph>
  );
}
