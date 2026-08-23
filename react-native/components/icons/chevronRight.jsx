import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';

export function ChevronRight({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M8.5 4 16.5 12l-8 8" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
