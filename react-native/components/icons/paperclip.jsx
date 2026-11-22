import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function PaperclipIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M20.5 11.5 12.4 19.6a5.5 5.5 0 0 1-7.8-7.8l8.5-8.5a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8" stroke={color} {...strokeProps} strokeWidth={2} />
    </Glyph>
  );
}
