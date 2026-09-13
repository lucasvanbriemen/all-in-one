import {Glyph} from './glyph';
import {Path} from 'react-native-svg';
import React from 'react';

export function LastIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path
        d="M19 6.54Q19 5 17.74 5.88L9.94 11.34Q9 12 9.94 12.66L17.74 18.12Q19 19 19 17.46zM5 5h3v14H5z"
        fill={color}
      />
    </Glyph>
  );
}
