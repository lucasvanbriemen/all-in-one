import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import React, {useEffect, useState} from 'react';
import {glass, useThemedStyles} from '../theme';

import {api} from '../api';
import {format} from './format';

// Transactions without a category. A row offers the merchant's last category
// as a one-tap suggestion; tapping the row opens every category, with an
// option to label the other open transactions from that merchant too.
export function UncategorizedTransactions() {
  const styles = useThemedStyles(createStyles);
  const [transactions, setTransactions] = useState(null);
  const [categories, setCategories] = useState({budget: [], other: []});
  const [expandedId, setExpandedId] = useState(null);
  const [lastAction, setLastAction] = useState(null);

  useEffect(() => {
    api.get('/money/transactions/uncategorized').then(response => {
      setTransactions(response.transactions);
      setCategories({budget: response.budget_categories, other: response.other_categories});
    });
  }, []);

  async function categorize(transaction, category, applyToMerchant = false) {
    const response = await api.post(`/money/transactions/${transaction.id}`, {
      category,
      apply_to_merchant: applyToMerchant,
    });
    const removed = transactions.filter(t => response.updated_ids.includes(t.id));

    setTransactions(current => current.filter(t => !response.updated_ids.includes(t.id)));
    setExpandedId(null);
    setLastAction({category, name: transaction.counterparty_name || 'Unknown', removed});
  }

  async function undo() {
    const {removed} = lastAction;
    setLastAction(null);
    await Promise.all(removed.map(t => api.post(`/money/transactions/${t.id}`, {category: null})));
    setTransactions(current => [...current, ...removed].sort(newestFirst));
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        Uncategorized{transactions ? ` (${transactions.length})` : ''}
      </Text>

      {lastAction ? (
        <View style={styles.undoBar}>
          <Text style={styles.undoText} numberOfLines={1}>
            {lastAction.name} → {lastAction.category}
            {lastAction.removed.length > 1 ? ` (${lastAction.removed.length})` : ''}
          </Text>
          <Pressable onPress={undo} hitSlop={8}>
            <Text style={styles.undoButton}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView style={styles.list}>
        {transactions && transactions.length === 0 && (
          <Text style={styles.empty}>Every transaction has a category.</Text>
        )}
        {transactions && transactions.map(transaction => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            categories={categories}
            sameMerchantCount={transactions.filter(t =>
              t.id !== transaction.id && t.counterparty_name && t.counterparty_name === transaction.counterparty_name,
            ).length}
            expanded={expandedId === transaction.id}
            onToggle={() => setExpandedId(expandedId === transaction.id ? null : transaction.id)}
            onCategorize={(category, applyToMerchant) => categorize(transaction, category, applyToMerchant)}
            styles={styles}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TransactionRow({transaction, categories, sameMerchantCount, expanded, onToggle, onCategorize, styles}) {
  const [applyToMerchant, setApplyToMerchant] = useState(false);
  const suggestion = transaction.suggested_category;

  return (
    <View style={[styles.transaction, expanded && styles.transactionExpanded]}>
      <Pressable style={styles.row} onPress={onToggle}>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>{transaction.counterparty_name || 'Unknown'}</Text>
          <Text style={styles.date}>{format.date(transaction.booking_date)}</Text>
        </View>
        <Text style={[styles.amount, Number(transaction.amount) > 0 && styles.income]}>
          {format.money(transaction.amount)}
        </Text>
        {suggestion && !expanded ? (
          <Pressable style={[styles.chip, styles.chipSuggested]} onPress={() => onCategorize(suggestion)} hitSlop={4}>
            <Text style={[styles.chipText, styles.chipTextSuggested]}>{suggestion}</Text>
          </Pressable>
        ) : null}
        <Text style={styles.chevron}>{expanded ? '▴' : '▾'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.picker}>
          {transaction.description ? (
            <Text style={styles.description} numberOfLines={2}>{transaction.description}</Text>
          ) : null}

          <CategoryGroup title="Budgets" categories={categories.budget} suggestion={suggestion}
            onPick={category => onCategorize(category, applyToMerchant)} styles={styles} />
          <CategoryGroup title="Other" categories={categories.other} suggestion={suggestion}
            onPick={category => onCategorize(category, applyToMerchant)} styles={styles} />

          {sameMerchantCount > 0 ? (
            <Pressable style={styles.checkboxRow} onPress={() => setApplyToMerchant(!applyToMerchant)}>
              <View style={[styles.checkbox, applyToMerchant && styles.checkboxChecked]}>
                {applyToMerchant ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.checkboxLabel}>
                Also the {sameMerchantCount} other from {transaction.counterparty_name}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CategoryGroup({title, categories, suggestion, onPick, styles}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chips}>
        {categories.map(category => (
          <Pressable
            key={category}
            style={[styles.chip, category === suggestion && styles.chipSuggested]}
            onPress={() => onPick(category)}>
            <Text style={[styles.chipText, category === suggestion && styles.chipTextSuggested]}>{category}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function newestFirst(a, b) {
  return b.booking_date.localeCompare(a.booking_date) || b.id - a.id;
}

const createStyles = colors => StyleSheet.create({
  card: {
    flex: 1,
    ...glass(colors),
    padding: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.onSurface,
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.inverseSurface,
  },
  undoText: {
    flex: 1,
    fontSize: 14,
    color: colors.inverseOnSurface,
  },
  undoButton: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.inversePrimary,
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
  },
  transactionExpanded: {
    borderWidth: 1,
    borderColor: colors.primary,
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
  chevron: {
    fontSize: 14,
    color: colors.outline,
  },
  picker: {
    marginTop: 12,
    gap: 12,
  },
  description: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  group: {
    gap: 6,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.outline,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.surfaceVariant,
  },
  chipSuggested: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  chipTextSuggested: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    fontSize: 12,
    lineHeight: 14,
    color: colors.onPrimary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurface,
  },
});
