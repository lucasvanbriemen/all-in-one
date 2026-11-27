import { ScrollView, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { surfaceStyle, useThemedStyles } from '../theme';

import { DrivingMap } from './DrivingMap';
import { Stat } from '../home/Stat';
import { format } from './format';
import { useApi } from '../useApi';
import { useBottomInset, useCompactLayout } from '../useCompactLayout';

// Trips come from the CarPlay Shortcut, fill-ups from fuel transactions.
// Litres are exact when entered at the pump, otherwise estimated (marked ≈).
export function DrivingPage() {
  const compact = useCompactLayout();
  const bottomInset = useBottomInset();
  const styles = useThemedStyles(createStyles);
  const data = useApi('/driving').data;

  const months = data?.months ?? [];
  const trips = [...(data?.trips ?? [])].reverse();
  const fillUps = [...(data?.fill_ups ?? [])].reverse();
  const thisMonth = months[months.length - 1];

  return (
    <View style={styles.content}>
      <View style={[styles.stats, compact && styles.compactStats]}>
        <Stat
          value={thisMonth ? format.money(thisMonth.euros) : '–'}
          label="Fuel this month"
        />
        <Stat
          value={thisMonth ? `${thisMonth.km} km` : '–'}
          label="Driven this month"
        />
        <Stat
          value={
            thisMonth?.litres_per_100km
              ? `${thisMonth.litres_per_100km} L`
              : '–'
          }
          label="Per 100 km"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset }]}
      >
        <DrivingMap trips={data?.trips ?? []} />

        <View style={[styles.columns, compact && styles.compactColumns]}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trips</Text>
            {trips.length === 0 ? (
              <Text style={styles.empty}>
                No trips yet. They show up once the CarPlay Shortcut runs.
              </Text>
            ) : null}
            {trips.map(trip => (
              <View key={trip.started_at} style={styles.item}>
                <View style={styles.row}>
                  <Text style={styles.name}>
                    {format.date(trip.started_at)}
                  </Text>
                  <Text style={styles.value}>
                    {trip.km != null ? `${trip.km} km` : '– km'}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {format.time(trip.started_at)}–{format.time(trip.ended_at)} ·{' '}
                  {trip.minutes} min
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fill-ups</Text>
            {fillUps.length === 0 ? (
              <Text style={styles.empty}>No fuel transactions.</Text>
            ) : null}
            {fillUps.map((fill, index) => (
              <View key={`${fill.date}-${index}`} style={styles.item}>
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>
                    {fill.station || 'Fuel'}
                  </Text>
                  <Text style={styles.value}>{format.money(fill.euros)}</Text>
                </View>
                <Text style={styles.meta}>
                  {format.date(fill.date)}
                  {fill.litres != null
                    ? ` · ${fill.litres_source === 'entered' ? '' : '≈ '}${
                        fill.litres
                      } L`
                    : ''}
                  {fill.price_per_litre != null
                    ? ` · ${format.money(fill.price_per_litre)}/L`
                    : ''}
                  {fill.average_price_per_litre != null
                    ? ` (avg ${format.money(fill.average_price_per_litre)})`
                    : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = colors =>
  StyleSheet.create({
    content: { flex: 1 },
    stats: { flexDirection: 'row', gap: 16, paddingTop: 16 },
    compactStats: { flexWrap: 'wrap', gap: 8 },
    scroll: { paddingTop: 16, gap: 16 },
    columns: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    compactColumns: { flexDirection: 'column', alignItems: 'stretch' },
    card: {
      flex: 1,
      ...surfaceStyle(colors),
      padding: 16,
      borderRadius: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: colors.onSurface,
    },
    empty: { fontSize: 14, color: colors.onSurfaceVariant },
    item: {
      ...surfaceStyle(colors, { variant: 'subtle' }),
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: {
      flex: 1,
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.onSurface,
    },
    value: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface },
    meta: { fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  });
