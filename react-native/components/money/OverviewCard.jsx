import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {api} from '../api';
import {format} from './format';
import {useCompactLayout} from '../useCompactLayout';

export function OverviewCard() {
  const compact = useCompactLayout();
  const styles = useThemedStyles(createStyles);
  const [overview, setOverview] = useState([]);
  const [shouldShowNumbers, setShouldShowNumbers] = useState(false);

  useEffect(() => {
    api.get('/money/overview').then(response => {
      setOverview(response);
    });
  }, []);

  return (
    <Pressable style={styles.content} onPress={() => setShouldShowNumbers(!shouldShowNumbers)}>
      <View style={styles.row}>
        <Text style={[styles.title, styles.titleHighlight]}>Money to be used</Text>
        <Text style={[styles.number, styles.titleHighlight]}>{shouldShowNumbers ? format.money(overview?.balance_min_fixed_costs) : '•••'}</Text>
      </View>

      <View style={[styles.row, styles.rowEven]}>
        <Text style={[styles.title, styles.titleHighlight]}>Money per day</Text>
        <Text style={[styles.number, styles.titleHighlight]}>{shouldShowNumbers ? format.money(overview?.money_per_day) : '•••'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.title}>Fixed costs till next payday</Text>
        <Text style={styles.number}>{shouldShowNumbers ? format.money(overview?.fixed_costs_till_next_payday) : '•••'}</Text>
      </View>

      <View style={[styles.row, styles.rowEven]}>
        <Text style={styles.title}>Expected Variable Costs</Text>
        <Text style={styles.number}>{shouldShowNumbers ? format.money(overview?.variable_costs_till_next_payday) : '•••'}</Text>
      </View>

      <View style={[styles.row]}>
        <Text style={styles.title}>Next payday</Text>
        <Text style={styles.number}>{shouldShowNumbers ? format.date(overview?.next_payday) : '•••'}</Text>
      </View>

      {shouldShowNumbers && overview?.budgets ? (
        <BudgetProgress period={overview.budgets} uncategorizedCount={overview.uncategorized_count} styles={styles} />
      ) : null}

      {!shouldShowNumbers ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <Text style={[styles.title, styles.titleHighlight, styles.overlayText]}>Sensitive Numbers</Text>
        </View>
      ) : null}

    </Pressable>
  );
}

// Each budget as a bar of how much is used, with a marker at how far the pay
// period has passed: a fill past the marker means spending ahead of schedule.
function BudgetProgress({period, uncategorizedCount, styles}) {
  const timePassed = period.percentage_time_passed;

  return (
    <View style={styles.budgets}>
      <View style={styles.budgetsHeader}>
        <Text style={[styles.title, styles.titleHighlight]}>Budgets</Text>
        <Text style={styles.caption}>{timePassed}% of the period passed</Text>
      </View>

      {period.budgets.map(budget => {
        const used = budget.percentage_used;
        const fillStyle = used > 100 ? styles.fillOver : used > timePassed ? styles.fillAhead : styles.fillOnTrack;

        return (
          <View key={budget.name} style={styles.budget}>
            <View style={styles.budgetRow}>
              <Text style={styles.title}>{budget.name}</Text>
              <Text style={styles.number}>
                {format.money(budget.spent)} / {format.money(budget.budget)} · {used}%
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, fillStyle, {width: `${Math.min(Math.max(used, 0), 100)}%`}]} />
              <View style={[styles.marker, {left: `${timePassed}%`}]} />
            </View>
            <Text style={styles.caption}>{format.money(budget.remaining)} left</Text>
          </View>
        );
      })}

      {uncategorizedCount > 0 ? (
        <Text style={styles.caption}>
          {uncategorizedCount} transactions without a category are not counted yet.
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  budgets: {
    marginTop: 8,
    padding: 12,
    gap: 12,
  },
  budgetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  budget: {
    gap: 4,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.outlineVariant,
    overflow: 'visible',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  fillOnTrack: {
    backgroundColor: colors.success,
  },
  fillAhead: {
    backgroundColor: colors.warning,
  },
  fillOver: {
    backgroundColor: colors.error,
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 14,
    marginLeft: -1,
    backgroundColor: colors.onSurface,
  },
  caption: {
    fontSize: 12,
    color: colors.outline,
  },
  content: {
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  rowEven: {
    ...glass(colors),
  },
  title: {
    color: colors.onSurfaceVariant,
    fontSize: 16,
  },
  number: {
    color: colors.onSurface,
    fontSize: 16,
  },
  titleHighlight: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  overlay: {
    ...glass(colors),
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

