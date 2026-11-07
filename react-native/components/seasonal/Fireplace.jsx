import {Animated, Easing, StyleSheet, View, useColorScheme} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import Svg, {Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';

import {Snowfall} from './Snowfall';
import {TreeDrawing} from './ChristmasTree';
import {useSeasonalData} from './data';

/**
 * Christmas Eve to Boxing Day the app sits in a living room: a fire going,
 * snow outside the window, your tree in the corner. It is a backdrop, not a
 * page — everything stays usable on top, and the glass panels let the room
 * glow through.
 *
 * The room is drawn once in scene units (SCENE wide, SCENE_HEIGHT tall) and
 * scaled to cover the window, anchored to the floor so the fire never gets
 * cropped. Only the parts that move (fire, sparks, candles, lights, the cat)
 * are separate animated layers placed over it.
 */
const SCENE = 1200;
const SCENE_HEIGHT = 660;

// Where things are, in scene units.
const PANES = {x: 126, y: 136, w: 188, h: 268};
const OPENING = {x: 505, y: 370, w: 190, h: 185};
const TREE = {x: 880, y: 285, w: 250};
const CANDLES = [{x: 440, top: 214}, {x: 760, top: 226}];

export function FireplaceBackdrop({width, height}) {
  const scheme = useColorScheme() ?? 'light';
  const [tree] = useSeasonalData('/seasonal/tree');

  if (!width || !height) return null;

  // Cover the window, keep the floor on the bottom edge and the hearth centred.
  const k = Math.max(width / SCENE, height / SCENE_HEIGHT);
  const offsetX = (width - SCENE * k) / 2;
  const offsetY = height - SCENE_HEIGHT * k;
  const place = (x, y, w, h) => ({position: 'absolute', left: offsetX + x * k, top: offsetY + y * k, width: w * k, height: h * k});

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <Svg style={place(0, 0, SCENE, SCENE_HEIGHT)} viewBox={`0 0 ${SCENE} ${SCENE_HEIGHT}`}>
        <Room />
      </Svg>

      <View style={[place(PANES.x, PANES.y, PANES.w, PANES.h), styles.clip]}>
        <Snowfall intensity="light" />
      </View>

      <Svg style={place(60, 88, 320, 442)} viewBox="60 88 320 442">
        <WindowFront />
      </Svg>

      <RoomGlow style={place(0, 0, SCENE, SCENE_HEIGHT)} />

      <Fire k={k} style={place(OPENING.x, OPENING.y, OPENING.w, OPENING.h)} />

      {CANDLES.map(candle => (
        <View key={candle.x} style={place(candle.x - 10, candle.top - 30, 20, 32)}>
          <CandleFlame />
        </View>
      ))}

      <Twinkles style={place(380, 100, 440, 220)} />

      <View style={place(TREE.x, TREE.y, TREE.w, TREE.w * 1.2)}>
        <TreeDrawing ornaments={tree?.ornaments ?? 0} lights={tree?.lights ?? 0} star={Boolean(tree?.star)} size={TREE.w * k} />
      </View>

      <Svg style={place(860, 480, 300, 120)} viewBox="860 480 300 120">
        <Presents />
      </Svg>

      <SleepingCat style={place(400, 560, 120, 70)} />

      {/* Softens the room behind the content so it reads as a backdrop. */}
      <View style={[StyleSheet.absoluteFill, {backgroundColor: scheme === 'dark' ? 'rgba(12, 8, 6, 0.4)' : 'rgba(250, 244, 236, 0.5)'}]} />
    </View>
  );
}

/** The static room: wall, panelling, floor, window view, fireplace, wreath, stockings, garland. */
const Room = React.memo(function Room() {
  const bricks = useMemo(buildBricks, []);

  return (
    <>
      <Defs>
        <LinearGradient id="fp-wall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1f1412" />
          <Stop offset="1" stopColor="#3a221a" />
        </LinearGradient>
        <LinearGradient id="fp-floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3b2416" />
          <Stop offset="1" stopColor="#24150d" />
        </LinearGradient>
        <LinearGradient id="fp-night" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#070d22" />
          <Stop offset="1" stopColor="#1f3a66" />
        </LinearGradient>
        <RadialGradient id="fp-moon" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#fff7d6" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#fff7d6" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="fp-wood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7a4a2a" />
          <Stop offset="1" stopColor="#4a2a17" />
        </LinearGradient>
        <LinearGradient id="fp-firebox" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#090403" />
          <Stop offset="1" stopColor="#2c1209" />
        </LinearGradient>
        <LinearGradient id="fp-shade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <Stop offset="0.25" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.75" stopColor="#000" stopOpacity="0" />
          <Stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </LinearGradient>
        <RadialGradient id="fp-treeglow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffcf7a" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
        </RadialGradient>
        <ClipPath id="fp-surround">
          <Rect x="430" y="290" width="340" height="265" />
        </ClipPath>
      </Defs>

      {/* Wall with a faint stripe */}
      <Rect x="0" y="0" width={SCENE} height="560" fill="url(#fp-wall)" />
      {Array.from({length: 31}, (_, i) => (
        <Rect key={i} x={i * 40} y="0" width="14" height="466" fill="#ffffff" opacity="0.025" />
      ))}

      {/* Wainscoting and chair rail */}
      <Rect x="0" y="466" width={SCENE} height="90" fill="#2c1912" />
      {Array.from({length: 12}, (_, i) => (
        <Rect key={i} x={12 + i * 100} y="482" width="76" height="58" rx="3" fill="none" stroke="#1b0f0a" strokeWidth="3" opacity="0.8" />
      ))}
      <Rect x="0" y="462" width={SCENE} height="8" fill="#5a3826" />
      <Rect x="0" y="550" width={SCENE} height="12" fill="#1c100a" />

      {/* Floorboards */}
      <Rect x="0" y="560" width={SCENE} height="100" fill="url(#fp-floor)" />
      {[580, 604, 632].map(y => (
        <Line key={y} x1="0" y1={y} x2={SCENE} y2={y} stroke="#1a0e08" strokeWidth="2" opacity="0.7" />
      ))}
      {Array.from({length: 14}, (_, i) => (
        <Line key={i} x1={(i * 173) % SCENE} y1={[560, 580, 604, 632][i % 4]} x2={(i * 173) % SCENE} y2={[580, 604, 632, 660][i % 4]} stroke="#1a0e08" strokeWidth="2" opacity="0.6" />
      ))}

      {/* Rug */}
      <Ellipse cx="600" cy="618" rx="300" ry="40" fill="#5e1418" />
      <Ellipse cx="600" cy="618" rx="284" ry="33" fill="none" stroke="#c9a14a" strokeWidth="3" strokeDasharray="10 6" opacity="0.7" />
      <Ellipse cx="600" cy="618" rx="250" ry="25" fill="#7a1d22" />

      {/* Glow behind the tree */}
      <Ellipse cx="1005" cy="430" rx="200" ry="200" fill="url(#fp-treeglow)" />

      {/* The view out of the window */}
      <Rect x={PANES.x} y={PANES.y} width={PANES.w} height={PANES.h} fill="url(#fp-night)" />
      {STARS.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity={0.5 + (i % 3) * 0.2} />
      ))}
      <Circle cx="272" cy="176" r="34" fill="url(#fp-moon)" />
      <Circle cx="272" cy="176" r="13" fill="#fff6d8" />
      <Circle cx="277" cy="172" r="11" fill="#1a2c55" opacity="0.18" />
      <Path d="M126 352 C170 330 220 336 260 346 C285 352 300 344 314 340 V404 H126 Z" fill="#c9d8ee" />
      {[[150, 352], [166, 344], [292, 346], [304, 350]].map(([x, y], i) => (
        <Path key={i} d={`M${x} ${y - 30} L${x + 10} ${y} H${x - 10} Z`} fill="#142645" />
      ))}
      <Rect x="218" y="330" width="26" height="18" fill="#2a2030" />
      <Path d="M214 332 L231 318 L248 332 Z" fill="#e8f0fa" />
      <Rect x="226" y="336" width="7" height="7" fill="#ffd27a" />
      <Path d="M126 378 C180 366 240 372 314 362 V404 H126 Z" fill="#eef4fc" />

      {/* Wreath above the mantel */}
      <Circle cx="600" cy="168" r="50" fill="none" stroke="#173f26" strokeWidth="26" />
      <Circle cx="600" cy="168" r="50" fill="none" stroke="#2c6b42" strokeWidth="18" strokeDasharray="5 4" />
      <Circle cx="600" cy="168" r="50" fill="none" stroke="#3f8a57" strokeWidth="6" strokeDasharray="2 9" />
      {Array.from({length: 9}, (_, i) => {
        const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
        return <Circle key={i} cx={600 + Math.cos(a) * 50} cy={168 + Math.sin(a) * 50} r="4" fill="#d1232a" />;
      })}
      <Path d="M600 214 C580 200 570 222 582 228 C590 232 598 222 600 214 Z" fill="#b5121b" />
      <Path d="M600 214 C620 200 630 222 618 228 C610 232 602 222 600 214 Z" fill="#b5121b" />
      <Path d="M598 216 L588 246 L594 244 L600 220 L606 244 L612 246 L602 216 Z" fill="#8f0e15" />
      <Circle cx="600" cy="215" r="5" fill="#d1232a" />

      {/* Chimney breast */}
      <Rect x="420" y="0" width="360" height="262" fill="#000" opacity="0.08" />

      {/* Brick surround */}
      <Rect x="430" y="290" width="340" height="265" fill="#3d211a" />
      <G clipPath="url(#fp-surround)">
        {bricks.map((brick, i) => (
          <Rect key={i} x={brick.x} y={brick.y} width="43" height="19" rx="1.5" fill={brick.color} />
        ))}
        <Rect x="430" y="290" width="340" height="265" fill="url(#fp-shade)" />
      </G>

      {/* Stone arch and jambs around the opening */}
      <Path d="M494 555 V465 A106 106 0 0 1 706 465 V555" fill="none" stroke="#2a1510" strokeWidth="26" />
      <Path d="M494 555 V465 A106 106 0 0 1 706 465 V555" fill="none" stroke="#a2715a" strokeWidth="22" strokeDasharray="22 2.5" />
      <Path d="M494 555 V465 A106 106 0 0 1 706 465 V555" fill="none" stroke="#c99a7e" strokeWidth="2" opacity="0.5" />
      <Rect x="587" y="346" width="26" height="30" rx="2" fill="#b98468" />

      {/* Firebox */}
      <Path d={`M${OPENING.x} 555 V465 A95 95 0 0 1 ${OPENING.x + OPENING.w} 465 V555 Z`} fill="url(#fp-firebox)" />
      {[400, 425, 450, 475, 500, 525].map(y => (
        <Line key={y} x1="510" y1={y} x2="690" y2={y} stroke="#4a2414" strokeWidth="1.5" opacity="0.35" />
      ))}

      {/* Hearth slab */}
      <Rect x="402" y="553" width="396" height="10" rx="2" fill="#8d7f75" />
      <Rect x="406" y="563" width="388" height="16" fill="#5e534c" />

      {/* Mantel */}
      <Rect x="414" y="276" width="372" height="16" fill="#3b2213" />
      <Rect x="395" y="256" width="410" height="22" rx="3" fill="url(#fp-wood)" />
      <Rect x="395" y="256" width="410" height="2.5" fill="#a26a40" opacity="0.8" />
      <Path d="M420 292 h18 v10 q-9 8 -18 0 z M762 292 h18 v10 q-9 8 -18 0 z" fill="#3b2213" />

      {/* Candlesticks and candles */}
      {CANDLES.map(({x, top}) => (
        <G key={x}>
          <Rect x={x - 7} y={top} width="14" height={250 - top} rx="2" fill="#f3e9d2" />
          <Rect x={x - 7} y={top} width="4" height={250 - top} fill="#ffffff" opacity="0.5" />
          <Path d={`M${x - 14} 256 h28 l-6 -6 h-16 z`} fill="#c99a3a" />
          <Line x1={x} y1={top} x2={x} y2={top - 4} stroke="#2a1a10" strokeWidth="1.5" />
        </G>
      ))}

      {/* Stockings */}
      {STOCKINGS.map(stocking => (
        <Stocking key={stocking.x} {...stocking} />
      ))}

      {/* Garland along the mantel */}
      {[400, 500, 600, 700].map(a => (
        <G key={a}>
          <Path d={`M${a} 268 Q${a + 50} 306 ${a + 100} 268`} fill="none" stroke="#173f26" strokeWidth="16" strokeLinecap="round" />
          <Path d={`M${a} 268 Q${a + 50} 306 ${a + 100} 268`} fill="none" stroke="#2c6b42" strokeWidth="11" strokeDasharray="3 3" />
          <Path d={`M${a} 266 Q${a + 50} 302 ${a + 100} 266`} fill="none" stroke="#418f5b" strokeWidth="3" strokeDasharray="1 5" />
        </G>
      ))}
      {[400, 500, 600, 700, 800].map(x => (
        <G key={x}>
          <Circle cx={x - 3} cy="268" r="3.5" fill="#c1121f" />
          <Circle cx={x + 3} cy="270" r="3.5" fill="#d1232a" />
        </G>
      ))}

      {/* Log basket beside the hearth */}
      <Path d="M318 528 h70 l-6 46 h-58 z" fill="#6b4a2c" />
      {[0, 1, 2, 3].map(i => (
        <Line key={i} x1="320" y1={536 + i * 10} x2="386" y2={536 + i * 10} stroke="#4a3019" strokeWidth="2" />
      ))}
      {[[332, 522], [352, 518], [372, 523], [342, 510], [362, 508]].map(([x, y], i) => (
        <G key={i}>
          <Rect x={x - 10} y={y - 9} width="20" height="18" rx="3" fill="#5a3a22" />
          <Ellipse cx={x} cy={y} rx="9" ry="8" fill="#c89a6a" />
          <Circle cx={x} cy={y} r="4" fill="none" stroke="#9b6e45" strokeWidth="1" />
        </G>
      ))}

      {/* Cocoa on the hearth */}
      <Rect x="754" y="534" width="20" height="20" rx="3" fill="#b3202a" />
      <Path d="M774 538 q9 0 9 7 q0 7 -9 7" fill="none" stroke="#b3202a" strokeWidth="3" />
      <Ellipse cx="764" cy="535" rx="10" ry="2.5" fill="#5a3320" />
      <Rect x="760" y="531" width="6" height="5" rx="1.5" fill="#fff4ea" />
    </>
  );
});

function Stocking({x, color, cuff, stripe}) {
  return (
    <G transform={`translate(${x - 18} 286)`}>
      <Line x1="18" y1="-6" x2="18" y2="2" stroke="#c99a3a" strokeWidth="2" />
      <Path d="M5 14 V54 Q5 72 22 72 H40 Q54 72 54 60 Q54 50 42 48 H32 V14 Z" fill={color} />
      {stripe && (
        <>
          <Rect x="5" y="26" width="27" height="5" fill={stripe} opacity="0.9" />
          <Rect x="5" y="38" width="27" height="5" fill={stripe} opacity="0.9" />
        </>
      )}
      <Path d="M40 72 Q54 72 54 60 Q54 50 42 48 Q46 58 40 72 Z" fill={cuff} opacity="0.85" />
      <Rect x="0" y="0" width="37" height="16" rx="5" fill={cuff} />
    </G>
  );
}

const STOCKINGS = [
  {x: 480, color: '#b3202a', cuff: '#f4efe6', stripe: '#f4efe6'},
  {x: 600, color: '#1f6b3f', cuff: '#f4efe6'},
  {x: 720, color: '#8a1c3a', cuff: '#e9d8a6', stripe: '#c99a3a'},
];

const STARS = [
  [140, 150, 1], [168, 172, 1.4], [196, 148, 0.9], [210, 196, 1.2], [236, 158, 1], [150, 214, 1.1],
  [302, 222, 1], [188, 236, 0.8], [252, 230, 1.2], [296, 150, 0.9], [176, 270, 1], [230, 280, 0.8],
  [140, 290, 1], [300, 288, 1.1], [266, 262, 0.9],
];

/** Stone bricks with a little colour variation, the same every render. */
function buildBricks() {
  const palette = ['#8a4636', '#7b3c2e', '#93503e', '#6e3429', '#844234', '#9a5a46'];
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const bricks = [];
  for (let row = 0; row * 21 + 290 < 555; row++) {
    const offset = row % 2 ? 22 : 0;
    for (let x = 430 - offset; x < 770; x += 45) {
      bricks.push({x, y: 291 + row * 21, color: palette[Math.floor(random() * palette.length)]});
    }
  }
  return bricks;
}

/** Wanders between random values, so nothing flickers on a visible loop. */
function useFlicker(minMs = 90, maxMs = 260) {
  const value = useMemo(() => new Animated.Value(0.5), []);

  useEffect(() => {
    let alive = true;
    let animation;
    const next = () => {
      if (!alive) return;
      animation = Animated.timing(value, {
        toValue: Math.random(),
        duration: minMs + Math.random() * (maxMs - minMs),
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
      animation.start(({finished}) => finished && next());
    };
    next();
    return () => {
      alive = false;
      animation?.stop();
    };
  }, [value, minMs, maxMs]);

  return value;
}

/** Firelight on the walls and floor, breathing with the fire. */
function RoomGlow({style}) {
  const flicker = useFlicker(140, 420);
  return (
    <Animated.View style={[style, {opacity: flicker.interpolate({inputRange: [0, 1], outputRange: [0.7, 1]})}]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${SCENE} ${SCENE_HEIGHT}`}>
        <Defs>
          <RadialGradient id="fp-roomglow" cx="600" cy="480" r="560" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#ff9a3c" stopOpacity="0.32" />
            <Stop offset="0.5" stopColor="#ff7a1a" stopOpacity="0.1" />
            <Stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="fp-floorglow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#ffb057" stopOpacity="0.45" />
            <Stop offset="1" stopColor="#ffb057" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={SCENE} height={SCENE_HEIGHT} fill="url(#fp-roomglow)" />
        <Ellipse cx="600" cy="590" rx="330" ry="70" fill="url(#fp-floorglow)" />
      </Svg>
    </Animated.View>
  );
}

// Flame tongues inside the opening, in opening units (190 × 185, logs at y ≈ 150).
const FLAMES = [
  {x: 70, w: 70, h: 112, inner: '#ff7b00', outer: '#c81d0a', min: 140, max: 320},
  {x: 120, w: 76, h: 124, inner: '#ff8c1a', outer: '#d4260c', min: 120, max: 300},
  {x: 95, w: 84, h: 138, inner: '#ff9e2c', outer: '#e0420f', min: 160, max: 360},
  {x: 78, w: 50, h: 92, inner: '#ffc53d', outer: '#ff7b00', min: 90, max: 220},
  {x: 114, w: 54, h: 100, inner: '#ffd25a', outer: '#ff8c1a', min: 100, max: 240},
  {x: 96, w: 44, h: 70, inner: '#fff4c2', outer: '#ffc53d', min: 80, max: 180},
];
const SPARKS = 9;

function Fire({style, k}) {
  const embers = useFlicker(200, 500);

  return (
    <View style={[style, styles.clip, {borderTopLeftRadius: 95 * k, borderTopRightRadius: 95 * k}]}>
      <Animated.View style={[StyleSheet.absoluteFill, {opacity: embers.interpolate({inputRange: [0, 1], outputRange: [0.65, 1]})}]}>
        <Svg width="100%" height="100%" viewBox="0 0 190 185">
          <Defs>
            <RadialGradient id="fp-firelight" cx="95" cy="160" r="130" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#ff8a1c" stopOpacity="0.85" />
              <Stop offset="0.6" stopColor="#a8320a" stopOpacity="0.35" />
              <Stop offset="1" stopColor="#2c1209" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="190" height="185" fill="url(#fp-firelight)" />
        </Svg>
      </Animated.View>

      {FLAMES.map((flame, index) => (
        <Flame key={index} index={index} k={k} {...flame} />
      ))}

      {Array.from({length: SPARKS}, (_, i) => (
        <Spark key={i} k={k} />
      ))}

      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 190 185">
        <Defs>
          <RadialGradient id="fp-coals" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#ffb347" stopOpacity="0.95" />
            <Stop offset="0.6" stopColor="#e2470f" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#5a1a08" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="95" cy="166" rx="78" ry="14" fill="url(#fp-coals)" />
        <Log x1={28} y1={160} x2={150} y2={138} />
        <Log x1={162} y1={162} x2={44} y2={140} />
        <Log x1={40} y1={168} x2={152} y2={168} />
        {/* Grate */}
        <Rect x="22" y="176" width="146" height="5" rx="2" fill="#1a1a1c" />
        <Path d="M30 181 v4 M160 181 v4 M60 172 v8 M95 172 v8 M130 172 v8" stroke="#1a1a1c" strokeWidth="4" />
      </Svg>
    </View>
  );
}

/** A log from (x1,y1) to (x2,y2): bark, a cut end, and a line of ember along the top. */
function Log({x1, y1, x2, y2}) {
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const length = Math.hypot(x2 - x1, y2 - y1);
  return (
    <G transform={`translate(${x1} ${y1}) rotate(${angle})`}>
      <Rect x="0" y="-8" width={length} height="16" rx="7" fill="#3e2616" />
      <Rect x="0" y="-8" width={length} height="5" rx="2.5" fill="#5c3a22" />
      <Path d={`M12 -6 L${length * 0.4} -7 M${length * 0.55} -6 L${length - 14} -7`} stroke="#ff8a1c" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <Ellipse cx={length} cy="0" rx="4" ry="8" fill="#b88458" />
      <Ellipse cx={length} cy="0" rx="2" ry="4.5" fill="none" stroke="#7e5634" strokeWidth="0.8" />
    </G>
  );
}

function Flame({index, k, x, w, h, inner, outer, min, max}) {
  const flicker = useFlicker(min, max);
  const sway = useFlicker(min * 1.6, max * 1.8);
  const id = `fp-flame-${index}`;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: (x - w / 2) * k,
        top: (158 - h) * k,
        width: w * k,
        height: h * k,
        transformOrigin: 'bottom',
        opacity: flicker.interpolate({inputRange: [0, 1], outputRange: [0.78, 1]}),
        transform: [
          {scaleY: flicker.interpolate({inputRange: [0, 1], outputRange: [0.8, 1.08]})},
          {scaleX: flicker.interpolate({inputRange: [0, 1], outputRange: [1.06, 0.92]})},
          {skewX: sway.interpolate({inputRange: [0, 1], outputRange: ['-7deg', '7deg']})},
        ],
      }}>
      <Svg width="100%" height="100%" viewBox="0 0 60 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={inner} stopOpacity="1" />
            <Stop offset="0.55" stopColor={outer} stopOpacity="0.9" />
            <Stop offset="1" stopColor={outer} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d="M31 0 C34 16 46 26 52 44 C60 68 50 96 30 100 C10 96 0 70 8 48 C12 36 20 30 24 18 C26 26 28 30 30 34 C30 22 29 10 31 0 Z" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** One spark: drifts up the chimney, fades, and comes back from the coals. */
function Spark({k}) {
  const values = useMemo(() => ({x: new Animated.Value(0), y: new Animated.Value(0), opacity: new Animated.Value(0)}), []);

  useEffect(() => {
    let alive = true;
    let animation;
    const cycle = () => {
      if (!alive) return;
      const startX = 50 + Math.random() * 90;
      const duration = 1200 + Math.random() * 1400;
      values.x.setValue(startX * k);
      values.y.setValue(150 * k);
      values.opacity.setValue(0);
      animation = Animated.sequence([
        Animated.delay(Math.random() * 2400),
        Animated.parallel([
          Animated.timing(values.y, {toValue: (10 + Math.random() * 60) * k, duration, easing: Easing.out(Easing.quad), useNativeDriver: true}),
          Animated.timing(values.x, {toValue: (startX + (Math.random() - 0.5) * 50) * k, duration, useNativeDriver: true}),
          Animated.sequence([
            Animated.timing(values.opacity, {toValue: 1, duration: duration * 0.15, useNativeDriver: true}),
            Animated.timing(values.opacity, {toValue: 0, duration: duration * 0.85, useNativeDriver: true}),
          ]),
        ]),
      ]);
      animation.start(({finished}) => finished && cycle());
    };
    cycle();
    return () => {
      alive = false;
      animation?.stop();
    };
  }, [values, k]);

  const size = Math.max(2, 3 * k);
  return (
    <Animated.View
      style={[
        styles.spark,
        {width: size, height: size, borderRadius: size / 2, opacity: values.opacity, transform: [{translateX: values.x}, {translateY: values.y}]},
      ]}
    />
  );
}

function CandleFlame() {
  const flicker = useFlicker(80, 220);
  return (
    <Animated.View
      style={{
        flex: 1,
        transformOrigin: 'bottom',
        opacity: flicker.interpolate({inputRange: [0, 1], outputRange: [0.8, 1]}),
        transform: [
          {scaleY: flicker.interpolate({inputRange: [0, 1], outputRange: [0.85, 1.1]})},
          {skewX: flicker.interpolate({inputRange: [0, 1], outputRange: ['-5deg', '5deg']})},
        ],
      }}>
      <Svg width="100%" height="100%" viewBox="0 0 20 32">
        <Defs>
          <RadialGradient id="fp-candlehalo" cx="50%" cy="60%" r="50%">
            <Stop offset="0" stopColor="#ffd27a" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx="10" cy="20" rx="10" ry="12" fill="url(#fp-candlehalo)" />
        <Path d="M10 8 C13 14 15 19 13 24 C12 27 8 27 7 24 C5 19 8 14 10 8 Z" fill="#ffb238" />
        <Path d="M10 15 C11.5 18 12 21 11 23.5 C10.5 25 9.5 25 9 23.5 C8 21 8.8 18 10 15 Z" fill="#fff4c2" />
      </Svg>
    </Animated.View>
  );
}

/** Lights along the garland and around the wreath, twinkling out of step. */
const GARLAND_COLORS = ['#ffd36b', '#ff6b5b', '#8ee6a0', '#7fc8ff'];
const GARLAND_LIGHTS = (() => {
  const lights = [];
  [400, 500, 600, 700].forEach(a => {
    [0.15, 0.32, 0.5, 0.68, 0.85].forEach(t => {
      const x = (1 - t) * (1 - t) * a + 2 * (1 - t) * t * (a + 50) + t * t * (a + 100);
      const y = (1 - t) * (1 - t) * 268 + 2 * (1 - t) * t * 306 + t * t * 268;
      lights.push([x, y]);
    });
  });
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    lights.push([600 + Math.cos(angle) * 56, 168 + Math.sin(angle) * 56]);
  }
  return lights;
})();

function Twinkles({style}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setPhase(p => (p + 1) % 5), 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <Svg style={style} viewBox="380 100 440 220">
      {GARLAND_LIGHTS.map(([x, y], i) => {
        const dim = (i * 3 + phase) % 5 === 0;
        const color = GARLAND_COLORS[i % GARLAND_COLORS.length];
        return (
          <G key={i} opacity={dim ? 0.35 : 1}>
            <Circle cx={x} cy={y} r="6" fill={color} opacity="0.25" />
            <Circle cx={x} cy={y} r="2.6" fill={color} />
          </G>
        );
      })}
    </Svg>
  );
}

/** Window frame, muntins, frost and the curtains, drawn over the falling snow. */
function WindowFront() {
  return (
    <>
      <Defs>
        <LinearGradient id="fp-curtain" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#5a0d14" />
          <Stop offset="0.3" stopColor="#8f1822" />
          <Stop offset="0.55" stopColor="#6a1018" />
          <Stop offset="0.8" stopColor="#951b26" />
          <Stop offset="1" stopColor="#5a0d14" />
        </LinearGradient>
        <LinearGradient id="fp-frost" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.45" />
        </LinearGradient>
      </Defs>

      {/* Frost settling in the bottom of each pane */}
      {[136, 225, 315].map(y => (
        <G key={y}>
          <Rect x={PANES.x} y={y} width={PANES.w / 2} height="89" fill="url(#fp-frost)" />
          <Rect x={PANES.x + PANES.w / 2} y={y} width={PANES.w / 2} height="89" fill="url(#fp-frost)" />
        </G>
      ))}

      {/* Frame and muntins */}
      <Rect x="118" y="128" width="204" height="284" fill="none" stroke="#d9cbb3" strokeWidth="16" />
      <Rect x="110" y="120" width="220" height="300" fill="none" stroke="#8c7b62" strokeWidth="1.5" />
      <Rect x="217" y="136" width="6" height="268" fill="#d9cbb3" />
      <Rect x="126" y="222" width="188" height="6" fill="#d9cbb3" />
      <Rect x="126" y="312" width="188" height="6" fill="#d9cbb3" />
      <Path d="M126 404 C150 398 170 400 220 401 C260 402 290 398 314 404 Z" fill="#f4f8ff" />

      {/* Sill */}
      <Rect x="100" y="418" width="240" height="14" rx="3" fill="#cdbb9f" />
      <Rect x="104" y="432" width="232" height="6" fill="#8c7b62" />

      {/* Rod and curtains */}
      <Rect x="66" y="98" width="308" height="6" rx="3" fill="#b08a3e" />
      <Circle cx="66" cy="101" r="7" fill="#c99a3a" />
      <Circle cx="374" cy="101" r="7" fill="#c99a3a" />
      <Path d="M70 104 H150 C148 190 134 262 114 300 C134 350 150 430 156 528 H70 Z" fill="url(#fp-curtain)" />
      <Path d="M370 104 H290 C292 190 306 262 326 300 C306 350 290 430 284 528 H370 Z" fill="url(#fp-curtain)" />
      {[84, 100, 122, 318, 340, 356].map(x => (
        <Line key={x} x1={x} y1="106" x2={x} y2="526" stroke="#3d070c" strokeWidth="1.5" opacity="0.35" />
      ))}
      <Rect x="66" y="294" width="54" height="10" rx="5" fill="#c99a3a" />
      <Rect x="320" y="294" width="54" height="10" rx="5" fill="#c99a3a" />
    </>
  );
}

function Presents() {
  return (
    <>
      {PRESENTS.map(({x, y, w, h, box, ribbon}, i) => (
        <G key={i}>
          <Rect x={x} y={y} width={w} height={h} rx="2" fill={box} />
          <Rect x={x} y={y} width={w} height="6" fill="#000" opacity="0.12" />
          <Rect x={x + w / 2 - 4} y={y} width="8" height={h} fill={ribbon} />
          <Rect x={x} y={y + h / 2 - 3} width={w} height="6" fill={ribbon} opacity="0.85" />
          <Ellipse cx={x + w / 2 - 8} cy={y - 4} rx="9" ry="5" fill="none" stroke={ribbon} strokeWidth="3" />
          <Ellipse cx={x + w / 2 + 8} cy={y - 4} rx="9" ry="5" fill="none" stroke={ribbon} strokeWidth="3" />
        </G>
      ))}
    </>
  );
}

const PRESENTS = [
  {x: 890, y: 540, w: 62, h: 40, box: '#b3202a', ribbon: '#e9c46a'},
  {x: 958, y: 518, w: 50, h: 62, box: '#1f6b3f', ribbon: '#d1232a'},
  {x: 1040, y: 545, w: 72, h: 35, box: '#2b5c8f', ribbon: '#e8eef5'},
  {x: 1100, y: 558, w: 40, h: 26, box: '#c99a3a', ribbon: '#8a1c3a'},
];

/** A cat asleep on the rug, breathing slowly. */
function SleepingCat({style}) {
  const breath = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
        Animated.timing(breath, {toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true}),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  return (
    <Animated.View style={[style, {transformOrigin: 'bottom', transform: [{scaleY: breath.interpolate({inputRange: [0, 1], outputRange: [1, 1.05]})}]}]}>
      <Svg width="100%" height="100%" viewBox="400 560 120 70">
        <Path d="M500 610 C522 606 520 584 500 588" fill="none" stroke="#2b2b33" strokeWidth="7" strokeLinecap="round" />
        <Ellipse cx="470" cy="604" rx="38" ry="20" fill="#2b2b33" />
        <Ellipse cx="474" cy="598" rx="28" ry="10" fill="#3d3d48" opacity="0.6" />
        <Circle cx="438" cy="602" r="15" fill="#2b2b33" />
        <Path d="M427 594 L428 580 L438 590 Z M444 590 L452 580 L451 594 Z" fill="#2b2b33" />
        <Path d="M430 604 q4 3 8 0 M441 604 q4 3 8 0" stroke="#8f8fa0" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <Ellipse cx="470" cy="625" rx="40" ry="3" fill="#000" opacity="0.25" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {overflow: 'hidden', backgroundColor: '#1f1412'},
  clip: {overflow: 'hidden'},
  spark: {position: 'absolute', left: 0, top: 0, backgroundColor: '#ffd27a'},
});
