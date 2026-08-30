import {Glyph, strokeProps} from './glyph';
import {Path, Rect} from 'react-native-svg';

import React from 'react';

export function FilesIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M15.6 8.4V5.2a2 2 0 0 0-2-2H5.2a2 2 0 0 0-2 2v8.4a2 2 0 0 0 2 2h3.2" stroke={color} {...strokeProps} />
      <Rect x="8.4" y="8.4" width="12.4" height="12.4" rx="2" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
