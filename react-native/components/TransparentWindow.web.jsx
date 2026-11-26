import {StyleSheet, View} from 'react-native';

import {useTheme} from './theme';

// No desktop to blend with on the web: a solid step below the content card
// stands in for the sidebar material.
export function TransparentWindow({children}) {
  const colors = useTheme();

  return (
    <View style={[styles.root, {backgroundColor: colors.surfaceAt2}]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
