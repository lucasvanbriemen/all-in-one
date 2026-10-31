import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {api} from '../api';
import {format} from './format';

// Transactions without a category, each with a row of categories to tap.
// With "Same merchant" on, the choice also applies to every other
// uncategorized transaction from that counterparty.
export function UncategorizedTransactions() {
  const styles = useThemedStyles(createStyles);
  const [transactions, setTransactions] = useState(null);
  const [categories, setCategories] = useState([]);
  const [applyToMerchant, setApplyToMerchant] = useState(false);

  useEffect(() => {
    api.get('/money/transactions/uncategorized').then(response => {
      setTransactions(response.transactions);
      setCategories(response.categories);
    });
  }, []);

  async function categorize(transaction, category) {
    const response = await api.post(`/money/transactions/${transaction.id}`, {
      category,
      apply_to_merchant: applyToMerchant,
    });
    setTransactions(current => current.filter(t => !response.updated_ids.includes(t.id)));
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.cardTitle}>
          Uncategorized{transactions ? ` (${transactions.length})` : ''}
        </Text>
        <Pressable
          style={[styles.toggle, applyToMerchant && styles.toggleActive]}
          onPress={() => setApplyToMerchant(!applyToMerchant)}>
          <Text style={[styles.toggleText, applyToMerchant && styles.toggleTextActive]}>Same merchant</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list}>
        {transactions && transactions.length === 0 && (
          <Text style={styles.empty}>Every transaction has a category.</Text>
        )}
        {transactions && transactions.map(transaction => (
          <View key={transaction.id} style={styles.transaction}>
            <View style={styles.row}>
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>{transaction.counterparty_name || 'Unknown'}</Text>
                <Text style={styles.date}>{format.date(transaction.booking_date)}</Text>
              </View>
              <Text style={[styles.amount, Number(transaction.amount) > 0 && styles.income]}>
                {format.money(transaction.amount)}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map(category => (
                <Pressable key={category} style={styles.chip} onPress={() => categorize(transaction, category)}>
                  <Text style={styles.chipText}>{category}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {
    flex: 1,
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  toggle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  toggleTextActive: {
    color: colors.onPrimary,
  },
  list: {flex: 1},
  empty: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  transaction: {
    ...glass(colors, {variant: 'subtle'}),
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {flex: 1},
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  date: {
    fontSize: 12,
    color: colors.outline,
  },
  amount: {
    fontSize: 16,
    color: colors.onSurface,
  },
  income: {
    color: colors.success,
  },
  chips: {
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
  },
  chipText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
