import { Platform, useWindowDimensions } from 'react-native';

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
