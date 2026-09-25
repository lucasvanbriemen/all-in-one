import {Animated, Easing, Pressable, StyleSheet, useWindowDimensions} from 'react-native';
import {glass, useThemedStyles} from '../theme';
// components/music/NowPlayingDrawer.jsx
import {useEffect, useRef} from 'react';

import {NowPlayingCard} from './NowPlayingCard';
import {useAppContext} from '../../context/AppContext';

export function NowPlayingDrawer() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const {height} = useWindowDimensions();
  const open = get('music.is-expanded') === true;
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
      {open && <Pressable style={styles.backdrop} onPress={() => set('music.drawer.open', false)} />}
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