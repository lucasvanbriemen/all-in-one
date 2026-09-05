import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function NewFileIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M13.2 2.9H6.9a1.4 1.4 0 0 0-1.4 1.4v15.4a1.4 1.4 0 0 0 1.4 1.4h4.3" stroke={color} {...strokeProps} />
      <Path d="M13.2 2.9 18.5 8.2v3.4M13.2 2.9v5.3h5.3" stroke={color} {...strokeProps} />
      <Path d="M17.4 14.6v6.4M14.2 17.8h6.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
