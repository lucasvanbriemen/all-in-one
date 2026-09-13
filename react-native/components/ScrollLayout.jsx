import {createContext, useContext} from 'react';

export const ScrollLayoutContext = createContext(null);

// Insets live inside the scroll content, leaving the viewport free to extend
// to the screen edges and underneath the floating navigation.
export function useScrollLayout() {
  const insets = useContext(ScrollLayoutContext);
  if (!insets) { return {}; }
  return {
    contentContainerStyle: {
      paddingTop: insets.top + 12,
      paddingBottom: insets.bottom + 16,
      paddingLeft: insets.left + 20,
      paddingRight: insets.right + 20,
    },
    scrollIndicatorInsets: insets,
    contentInsetAdjustmentBehavior: 'never',
    automaticallyAdjustsScrollIndicatorInsets: false,
  };
}
