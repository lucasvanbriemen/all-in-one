import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function RenameIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M16.4 3.6a2.3 2.3 0 0 1 3.2 3.2L8.4 18.1l-4.2 1 1-4.2z" stroke={color} {...strokeProps} />
      <Path d="M14.6 5.4 17.8 8.6" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
