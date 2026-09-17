import {Glyph} from './glyph';

import {Path} from 'react-native-svg';
import React from 'react';

export const HEART_PATH =
  'M12 20.4c-.3 0-.6-.1-.8-.3C8.6 17.8 3 13.5 3 8.6 3 5.9 5.1 3.8 7.7 3.8c1.7 0 3.2.9 4.3 2.4 1.1-1.5 2.6-2.4 4.3-2.4 2.6 0 4.7 2.1 4.7 4.8 0 4.9-5.6 9.2-8.2 11.5-.2.2-.5.3-.8.3z';

export function HeartIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d={HEART_PATH} fill={color} />
    </Glyph>
  );
}
