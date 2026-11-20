import HapticFeedback from 'react-native-haptic-feedback';

// A light tick, like the one iOS gives when a swipe action arms.
export function tick() {
  HapticFeedback.trigger('impactLight', {enableVibrateFallback: false, ignoreAndroidSystemSettings: false});
}
