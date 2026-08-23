import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';

export function CheveronLeft({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M15.5 4 7.5 12l8 8" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
