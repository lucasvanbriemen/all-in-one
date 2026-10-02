import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function AgendaIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M8 6.5h12M8 12h12M8 17.5h12" stroke={color} {...strokeProps} />
      <Path d="M4 6.5h.01M4 12h.01M4 17.5h.01" stroke={color} {...strokeProps} strokeWidth={2.4} />
    </Glyph>
  );
}
