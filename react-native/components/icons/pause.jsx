import {Glyph} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function PauseIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M6 5h4v14H6zM14 5h4v14h-4z" fill={color} />
    </Glyph>
  );
}
