import {Animated, Easing, Pressable, StyleSheet, useWindowDimensions} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect, useRef} from 'react';

import {NowPlayingCard} from '../music/NowPlayingCard';
import {useAppContext} from '../../context/AppContext';

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const {height} = useWindowDimensions();
  const open = get('app.showSearch') === true;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, progress]);

  const translateY = progress.interpolate({inputRange: [0, 1], outputRange: [height, 0]});

  return (
    <>
      {open && <Pressable style={styles.backdrop} onPress={() => set('app.showSearch', false)} />}
      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.sheet, {transform: [{translateY}]}]}>
        <NowPlayingCard />
      </Animated.View>
    </>
  );
}

const createStyles = colors => StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)'},
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...glass(colors, {variant: 'subtle'}),
  },
});