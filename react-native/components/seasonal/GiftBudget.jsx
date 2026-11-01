import {Animated, Easing, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useMemo, useState} from 'react';
import Svg, {Path, Rect} from 'react-native-svg';
import {glass, useThemedStyles} from '../theme';
import {setPersisted, usePersisted} from './store';

import {SnowCap} from './SnowCap';
import {format} from '../money/format';
import {useSeason} from './useSeason';
import {useSeasonalData} from './data';

/**
 * The gift budget as a present that unwraps itself as you spend — categorise
 * a transaction as "Gifts" and the lid comes off a little more — plus the list
 * of who still needs one.
 */
export function GiftBudget() {
  const styles = useThemedStyles(createStyles);
  const {phase, year} = useSeason();
  const enabled = phase === 'pre' || phase === 'advent' || phase === 'christmas';
  const [gifts] = useSeasonalData('/seasonal/gifts', enabled);
  const list = usePersisted(`gifts.${year}.list`, []);
  const [name, setName] = useState('');

  const budget = Number(gifts?.budget) || 0;
  const spent = Math.abs(Number(gifts?.spent) || 0);
  const fraction = budget ? spent / budget : 0;
  const open = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(open, {toValue: Math.min(1, fraction), duration: 1200, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true}).start();
  }, [fraction, open]);

  if (!enabled) return null;

  const key = `gifts.${year}.list`;
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPersisted(key, [...list, {name: trimmed, done: false}]);
    setName('');
  };
  const toggle = index => setPersisted(key, list.map((item, i) => (i === index ? {...item, done: !item.done} : item)));
  const remove = index => setPersisted(key, list.filter((_, i) => i !== index));

  const over = fraction > 1;

  return (
    <View style={styles.card}>
      <SnowCap />
      <View style={styles.present}>
        <Animated.View
          style={{
            transform: [
              {translateY: open.interpolate({inputRange: [0, 1], outputRange: [0, -34]})},
              {translateX: open.interpolate({inputRange: [0, 1], outputRange: [0, 22]})},
              {rotate: open.interpolate({inputRange: [0, 1], outputRange: ['0deg', '28deg']})},
            ],
          }}>
          <Svg width={96} height={28} viewBox="0 0 96 28">
            <Rect x="0" y="8" width="96" height="20" rx="3" fill={over ? '#9d0208' : '#d62839'} />
            <Rect x="42" y="8" width="12" height="20" fill="#ffd23f" />
            <Path d="M48 9 C36 -4 24 4 40 9 Z M48 9 C60 -4 72 4 56 9 Z" fill="#ffd23f" />
          </Svg>
        </Animated.View>
        <Svg width={84} height={64} viewBox="0 0 84 64">
          <Rect x="0" y="0" width="84" height="64" rx="3" fill={over ? '#6a040f' : '#b3202f'} />
          <Rect x="36" y="0" width="12" height="64" fill="#ffd23f" opacity={Math.max(0.25, 1 - fraction)} />
        </Svg>
      </View>

      <View style={styles.details}>
        <Text style={styles.title}>Gift budget</Text>
        <Text style={[styles.amount, over && styles.over]}>
          {format.money(spent)} <Text style={styles.of}>of {format.money(budget)}</Text>
        </Text>
        <Text style={styles.hint}>
          {over ? 'Over budget. Santa is concerned.' : 'Categorise a purchase as “Gifts” and it counts here.'}
        </Text>

        <View style={styles.list}>
          {list.map((item, index) => (
            <View key={`${item.name}-${index}`} style={styles.row}>
              <Pressable onPress={() => toggle(index)} hitSlop={6}>
                <Text style={styles.check}>{item.done ? '🎁' : '⬜️'}</Text>
              </Pressable>
              <Text style={[styles.name, item.done && styles.nameDone]} numberOfLines={1}>
                {item.name}
              </Text>
              <Pressable onPress={() => remove(index)} hitSlop={6}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
          <TextInput
            style={styles.input}
            placeholder="Add someone to buy for…"
            placeholderTextColor={styles.hint.color}
            value={name}
            onChangeText={setName}
            onSubmitEditing={add}
          />
        </View>
      </View>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    card: {
      ...glass(colors),
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      flexDirection: 'row',
      gap: 20,
      alignItems: 'flex-start',
    },
    present: {alignItems: 'center', justifyContent: 'flex-end', width: 110, paddingTop: 30},
    details: {flex: 1, gap: 6},
    title: {fontSize: 18, fontWeight: 'bold', color: colors.onSurface},
    amount: {fontSize: 26, fontWeight: 'bold', color: colors.primary},
    over: {color: colors.error ?? '#d62839'},
    of: {fontSize: 16, fontWeight: 'normal', color: colors.outline},
    hint: {fontSize: 13, color: colors.outline},
    list: {marginTop: 8, gap: 4},
    row: {flexDirection: 'row', alignItems: 'center', gap: 8},
    check: {fontSize: 16},
    name: {flex: 1, fontSize: 15, color: colors.onSurface},
    nameDone: {color: colors.outline, textDecorationLine: 'line-through'},
    remove: {fontSize: 18, color: colors.outline, paddingHorizontal: 4},
    input: {
      borderWidth: 1,
      borderColor: colors.outlineVariant ?? colors.outline,
      borderRadius: 8,
      padding: 8,
      color: colors.onSurface,
      marginTop: 4,
    },
  });
