import React from 'react';
import {Path} from 'react-native-svg';
import {Glyph, strokeProps} from './glyph';

// SF Symbols `chevron.left.forwardslash.chevron.right` — the ios_icon for the
// "github" entry in Config::CONFIG. Not the Octocat: the native app shows the
// `</>` glyph, and the two builds should agree.
export function GithubIcon({size, color}) {
  return (
    <Glyph size={size}>
      <Path d="M8.6 7.6 4 12l4.6 4.4" stroke={color} {...strokeProps} />
      <Path d="M15.4 7.6 20 12l-4.6 4.4" stroke={color} {...strokeProps} />
      <Path d="M13.2 5.6 10.8 18.4" stroke={color} {...strokeProps} />
    </Glyph>
  );
}
