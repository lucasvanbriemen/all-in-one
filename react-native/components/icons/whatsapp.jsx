import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export function WhatsappIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path
        d="M3.6 20.4l1.3-4.2A8.4 8.4 0 1 1 8 19.2Z"
        stroke={color}
        {...strokeProps}
      />
      <Path
        d="M9.2 8.6c.3-.6.9-.6 1.2 0l.6 1.3c.1.3 0 .6-.2.8l-.5.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.5c.2-.2.5-.3.8-.2l1.3.6c.6.3.6.9 0 1.2-.8.6-1.8.7-2.7.3a8 8 0 0 1-4-4c-.4-.9-.3-1.9.3-2.7Z"
        stroke={color}
        {...strokeProps}
      />
    </Glyph>
  );
}
