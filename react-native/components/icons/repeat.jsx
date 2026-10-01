import {Glyph} from './glyph';
import {Path} from 'react-native-svg';
import React from 'react';

export function RepeatIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path
        d="M17 2l4 4-4 4V7H8a3 3 0 0 0-3 3v2H3v-2a5 5 0 0 1 5-5h9V2zM7 22l-4-4 4-4v3h9a3 3 0 0 0 3-3v-2h2v2a5 5 0 0 1-5 5H7v3z"
        fill={color}
      />
    </Glyph>
  );
}
