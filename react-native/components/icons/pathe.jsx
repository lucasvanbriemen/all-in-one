import {Circle, Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

import React from 'react';

export function PatheIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path
        d="M6.9 10.4 8.4 20.3a1.2 1.2 0 0 0 1.2 1h4.8a1.2 1.2 0 0 0 1.2-1l1.5-9.9Z"
        stroke={color}
        {...strokeProps}
      />
      <Path d="M12 10.6v10.7" stroke={color} {...strokeProps} />
      <Circle cx="9.3" cy="8.4" r="2.1" stroke={color} {...strokeProps} />
      <Circle cx="14.7" cy="8.4" r="2.1" stroke={color} {...strokeProps} />
      <Circle cx="12" cy="6.4" r="2.3" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
