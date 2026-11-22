import React from 'react';
import {Image} from 'react-native';

import {Wheel} from './Wheel';
import wheelImage from './wheel.png';

// Metro hands back an asset id, Vite a URL.
const WHEEL_SOURCE = typeof wheelImage === 'string' ? {uri: wheelImage} : wheelImage;

// Hue runs around the wheel, saturation from white in the centre to the full
// colour at the edge. The wheel itself is a pre-rendered image (generated with
// the same HSV maths as `hsvToHex`), so dragging only moves the markers.
const fromPosition = ({x, y}) => ({
  hue: ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360,
  saturation: Math.min(Math.hypot(x, y), 1),
});

const toPosition = ({hue, saturation}) => {
  const angle = (hue * Math.PI) / 180;
  return {x: Math.cos(angle) * saturation, y: Math.sin(angle) * saturation};
};

export function ColorWheel(props) {
  return (
    <Wheel
      {...props}
      fromPosition={fromPosition}
      toPosition={toPosition}
      background={
        <Image
          source={WHEEL_SOURCE}
          style={{width: props.size, height: props.size}}
          pointerEvents="none"
          draggable={false}
        />
      }
    />
  );
}
