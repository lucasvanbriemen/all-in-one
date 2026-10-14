import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';

import { useAppContext } from '../context/AppContext';

export function useCompactLayout() {
  const { width } = useWindowDimensions();
  return Platform.OS === "ios" || width < 900;
}

// Height of the floating mobile navigation (plus now-playing bar), measured in
// App.jsx. Add it as bottom padding to scroll content so the last items can
// scroll out from behind the navigation.
export function useBottomInset() {
  const { get } = useAppContext();
  const compact = useCompactLayout();
  return compact ? get('app.bottomInset') ?? 0 : 0;
}

// Height of the on-screen keyboard, 0 while hidden. iOS fires the "will" events
// so layout animates in step with the keyboard; Android only has "did" events.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subscriptions = [
      Keyboard.addListener(show, event => setHeight(event.endCoordinates.height)),
      Keyboard.addListener(hide, () => setHeight(0)),
    ];
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, []);

  return height;
}
