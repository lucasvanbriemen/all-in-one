import {StyleSheet, View} from 'react-native';

import {useTheme} from './theme';

export function TransparentWindow({children}) {
  const colors = useTheme();

  return (
    <View style={[styles.root, {backgroundColor: colors.surface}]}>
      {children}
    </View>
  );
}

export function GlassPanel({children, style, ...rest}) {
  return (
    <View style={[styles.panel, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  panel: {overflow: 'hidden'},
});
