import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function PasteIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M9 4.6H6.4A1.4 1.4 0 0 0 5 6v13.4a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4V6a1.4 1.4 0 0 0-1.4-1.4H15" stroke={color} {...strokeProps} />
      <Path d="M9.6 3.2h4.8a.8.8 0 0 1 .8.8v1.8a.8.8 0 0 1-.8.8H9.6a.8.8 0 0 1-.8-.8V4a.8.8 0 0 1 .8-.8z" stroke={color} {...strokeProps} />
      <Path d="M8.6 12.4h6.8M8.6 16h4.6" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
