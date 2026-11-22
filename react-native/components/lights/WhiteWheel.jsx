import React, {useId} from 'react';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';

import {Wheel} from './Wheel';
import {hsvToHex, svgId} from './color';

// White light, still sent to the lamp as an ordinary colour.
// Left → right runs warm → neutral → cool; top → bottom runs from a strong tint to almost pure white.
const WARM = {hue: 30, saturation: 0.85};
const COOL = {hue: 215, saturation: 0.4};
const MIN_STRENGTH = 0.25; // how much tint is left at the very bottom

// x and y run -1..1 across the wheel.
export function whiteAt({x, y}) {
  const strength = 1 - (1 - MIN_STRENGTH) * ((y + 1) / 2);
  const side = x < 0 ? WARM : COOL;
  return {hue: side.hue, saturation: Math.abs(x) * side.saturation * strength};
}

// The other way round, for a colour that came from the lamp or a scene. A colour
// doesn't pin down a single spot, so assume the vertical middle.
function positionOf({hue, saturation}) {
  const warm = hue < 120 || hue > 300;
  const side = warm ? WARM : COOL;
  const strength = 1 - (1 - MIN_STRENGTH) / 2;
  const x = Math.min(saturation / (side.saturation * strength), 1);
  return {x: warm ? -x : x, y: 0};
}

// Roughly a white the lamp can make; only these lamps get a marker on the white wheel.
export function isWhitish({hue, saturation}) {
  const warm = hue < 60 || hue > 340;
  const cool = hue > 190 && hue < 240;
  return (warm && saturation <= WARM.saturation) || (cool && saturation <= COOL.saturation) || saturation < 0.05;
}

export function WhiteWheel(props) {
  const {size} = props;
  const radius = size / 2;
  const temperatureId = svgId(useId());
  const fadeId = svgId(useId());

  return (
    <Wheel
      {...props}
      fromPosition={whiteAt}
      toPosition={positionOf}
      background={
        <Svg width={size} height={size} pointerEvents="none">
          <Defs>
            <LinearGradient id={temperatureId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={hsvToHex(WARM.hue, WARM.saturation)} />
              <Stop offset="0.5" stopColor="#ffffff" />
              <Stop offset="1" stopColor={hsvToHex(COOL.hue, COOL.saturation)} />
            </LinearGradient>
            {/* Fading towards white at the bottom is the same as scaling saturation down. */}
            <LinearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={1 - MIN_STRENGTH} />
            </LinearGradient>
          </Defs>
          <Circle cx={radius} cy={radius} r={radius} fill={`url(#${temperatureId})`} />
          <Circle cx={radius} cy={radius} r={radius} fill={`url(#${fadeId})`} />
        </Svg>
      }
    />
  );
}
