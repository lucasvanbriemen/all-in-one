import React from 'react';
import Svg from 'react-native-svg';

/**
 * Shared frame for the sidebar glyphs.
 *
 * Every icon is drawn on the same 24×24 grid with the same stroke weight, so
 * the set reads as one family rather than four unrelated drawings. Spread
 * `strokeProps` onto each <Path> and pass the colour through `stroke`.
 */
export const strokeProps = {
  fill: 'none',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function Glyph({size = 16, children}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {children}
    </Svg>
  );
}
