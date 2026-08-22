import React from 'react';
import {Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

/**
 * Two drawings rather than one rotated one: an open folder is a back panel
 * with a flap tipped forward, which no transform of the closed shape gives.
 */
export function FolderIcon({size, color, open = false}) {
  return (
    <Glyph size={size}>
      {open ? (
        <>
          <Path d="M4 17V6.5h5l2 2.5h7v3" stroke={color} {...strokeProps} />
          <Path d="M4 17l2.5-6.5H21L18.5 17Z" stroke={color} {...strokeProps} />
        </>
      ) : (
        <Path d="M3.5 18.5V6.5h5l2 2.5H20v9.5Z" stroke={color} {...strokeProps} />
      )}
    </Glyph>
  );
}
