import {Circle, Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

import React from 'react';

export function SongsIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M9 17.6V5.4l11-2v12.2" stroke={color} {...strokeProps} />
      <Path d="M9 9.4l11-2" stroke={color} {...strokeProps} />
      <Circle cx="6.4" cy="17.6" r="2.6" stroke={color} {...strokeProps} />
      <Circle cx="17.4" cy="15.6" r="2.6" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
