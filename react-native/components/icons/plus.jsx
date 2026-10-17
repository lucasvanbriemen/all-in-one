import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function PlusIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M12 6 L12 18" stroke={color} {...strokeProps} strokeWidth={2.4} />
      <Path d="M6 12 L18 12" stroke={color} {...strokeProps} strokeWidth={2.4} />
    </Glyph>
  );
}
