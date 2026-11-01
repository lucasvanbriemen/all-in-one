import {Platform} from 'react-native';

/**
 * Where the cursor (or finger) is, in window coordinates, for the snow to get
 * out of the way of, the frost to be wiped by and the drifts to be knocked off.
 *
 * Kept as a plain mutable object read on every animation frame — routing it
 * through React state would re-render on every mouse move.
 */
export const pointer = {x: -9999, y: -9999, vx: 0, vy: 0, at: 0};

const moveListeners = new Set();

export function onPointerMove(listener) {
  moveListeners.add(listener);
  return () => moveListeners.delete(listener);
}

function update(x, y) {
  if (x == null || y == null) return;
  const t = Date.now();
  const dt = Math.max(16, t - pointer.at);
  pointer.vx = ((x - pointer.x) / dt) * 16;
  pointer.vy = ((y - pointer.y) / dt) * 16;
  if (t - pointer.at > 200) {
    pointer.vx = 0;
    pointer.vy = 0;
  }
  pointer.x = x;
  pointer.y = y;
  pointer.at = t;
  moveListeners.forEach(listener => listener(pointer));
}

function fromEvent(event) {
  const native = event?.nativeEvent ?? event;
  const touch = native?.touches?.[0];
  const source = touch ?? native;
  return [source?.pageX ?? source?.clientX, source?.pageY ?? source?.clientY];
}

/**
 * Spread onto the root view. Which of these fire depends on the platform:
 * pointer events on the web and (where enabled) macOS, mouse moves on macOS,
 * touch moves on iOS. The web build also listens on the document, which sees
 * moves over the WebViews' neighbours that React Native's tree doesn't.
 */
export const pointerHandlers = {
  onPointerMove: event => update(...fromEvent(event)),
  onMouseMove: event => update(...fromEvent(event)),
  onTouchMove: event => update(...fromEvent(event)),
  onTouchStart: event => update(...fromEvent(event)),
};

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.addEventListener('mousemove', event => update(event.clientX, event.clientY), {passive: true});
}
