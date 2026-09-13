import { Platform, useWindowDimensions } from 'react-native';

export function useCompactLayout() {
  const { width } = useWindowDimensions();
  return Platform.OS === "ios" || width < 900;
}
