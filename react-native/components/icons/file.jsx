import React from 'react';
import {Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

export function FileIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M6.5 20.5V3.5h7L18 8v12.5Z" stroke={color} {...strokeProps} />
      <Path d="M13.5 3.5V8H18" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
