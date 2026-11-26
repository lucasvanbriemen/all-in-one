import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

// Slack's pinwheel reduced to its four bars, so it matches the stroke set.
export function SlackIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M9.6 3.6v7.2M14.4 13.2v7.2M3.6 14.4h7.2M13.2 9.6h7.2" stroke={color} {...strokeProps} />
      <Path d="M14.4 3.6v2.4M9.6 18v2.4M3.6 9.6H6M18 14.4h2.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
