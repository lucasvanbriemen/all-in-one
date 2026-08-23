import {Glyph, strokeProps} from './glyph';

import {Path} from 'react-native-svg';

export function ChevronTop({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M3.2 11 12 3.6 20.8 11" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
