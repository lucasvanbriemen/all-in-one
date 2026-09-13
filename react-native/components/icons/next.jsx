import {Glyph} from './glyph';
import {Path} from 'react-native-svg';
import React from 'react';

export function NextIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path
        d="M5 6.54Q5 5 6.26 5.88L14.06 11.34Q15 12 14.06 12.66L6.26 18.12Q5 19 5 17.46zM16 5h3v14h-3z"
        fill={color}
      />
    </Glyph>
  );
}
