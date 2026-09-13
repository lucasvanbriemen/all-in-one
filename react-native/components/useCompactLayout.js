import { Platform, useWindowDimensions } from 'react-native';

export function useCompactLayout() {
  const { width } = useWindowDimensions();
  return (Platform.OS === 'ios' && !Platform.isPad) || width < 900;
}
