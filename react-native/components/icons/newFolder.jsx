import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function NewFolderIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M11.4 14.6H3.6a1.4 1.4 0 0 1-1.4-1.4V5.1a1.4 1.4 0 0 1 1.4-1.4h3.6l2 2.4h6.6a1.4 1.4 0 0 1 1.4 1.4v3.1" stroke={color} {...strokeProps} />
      <Path d="M17.4 14.6v6.4M14.2 17.8h6.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
