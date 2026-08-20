import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function GithubIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M8.6 7.6 4 12l4.6 4.4" stroke={color} {...strokeProps} />
      <Path d="M15.4 7.6 20 12l-4.6 4.4" stroke={color} {...strokeProps} />
      <Path d="M13.2 5.6 10.8 18.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
