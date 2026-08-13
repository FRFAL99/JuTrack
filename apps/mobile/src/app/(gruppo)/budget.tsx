import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { budgetStatuses, monthBounds, parseAmount, shiftMonth } from '@jutrack/core';
import { formatCents, formatMoney } from '@/i18n/money';
import { Card } from '@/components/Card';
import { ModalScreen } from '@/components/ModalScreen';
import { currentMonth, formatMonthTitle } from '@/features/expenses/grouping';
import { useBudgets, useCategories, useCurrencySymbol, useExpenses, useVaultStore } from '@/state';
import { useTheme } from '@/theme';

/**
 * Limiti di spesa per categoria, mese per mese.
 *
 * Il budget vive su un mese preciso e non si eredita da solo: un limite deciso a gennaio
 * che si trascina fino a dicembre smetterebbe presto di somigliare alle intenzioni di chi
 * l'ha scritto. Il pulsante «copia dal mese scorso» rende comodo il caso frequente senza
 * far finta che sia automatico.
 */
export default function BudgetScreen() {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const store = useVaultStore();
  const [month, setMonth] = useState(currentMonth);

  const categories = useCategories();
  const budgets = useBudgets(month);
  const previousBudgets = useBudgets(shiftMonth(month, -1));
  const bounds = monthBounds(month);
  const monthExpenses = useExpenses({ from: bounds.from, to: bounds.to });

  const statuses = useMemo(
    () => budgetStatuses(budgets, monthExpenses, month),
    [budgets, monthExpenses, month],
  );
  const statusOf = (categoryId: string) => statuses.find((s) => s.categoryId === categoryId);
  const limitOf = (categoryId: string): number | null =>
    budgets.find((b) => b.categoryId === categoryId)?.limitCents ?? null;

  // Il testo in corso di modifica vive qui e non nel documento: scrivere a ogni tasto
  // genererebbe un update Yjs per carattere, e ogni update viaggia cifrato verso il relay.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const commit = (categoryId: string): void => {
    const draft = drafts[categoryId];
    if (draft === undefined) return;

    const trimmed = draft.trim();
    const limitCents = trimmed === '' ? 0 : parseAmount(trimmed);
    if (limitCents === null || limitCents < 0) {
      Alert.alert('Limite non valido', 'Inserisci un importo, oppure lascia vuoto per rimuoverlo.');
      setDrafts((c) => ({ ...c, [categoryId]: '' }));
      return;
    }

    store.setBudget(categoryId, month, limitCents);
    setDrafts((c) => {
      const next = { ...c };
      delete next[categoryId];
      return next;
    });
  };

  const copyPrevious = (): void => {
    if (previousBudgets.length === 0) return;
    store.transact(() => {
      for (const budget of previousBudgets) {
        store.setBudget(budget.categoryId, month, budget.limitCents);
      }
    });
  };

  return (
    <ModalScreen title="Budget">
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Step
              label="‹"
              hint="Mese precedente"
              onPress={() => setMonth(shiftMonth(month, -1))}
            />
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              {formatMonthTitle(month)}
            </Text>
            <Step label="›" hint="Mese successivo" onPress={() => setMonth(shiftMonth(month, 1))} />
          </View>
          {budgets.length === 0 && previousBudgets.length > 0 && (
            <Pressable onPress={copyPrevious} accessibilityRole="button" hitSlop={8}>
              <Text style={{ color: colors.accent, fontSize: fontSize.sm, textAlign: 'center' }}>
                Copia i limiti di {formatMonthTitle(shiftMonth(month, -1))}
              </Text>
            </Pressable>
          )}
        </Card>

        <Card style={{ gap: spacing.lg }}>
          {categories.map((category) => {
            const status = statusOf(category.id);
            const saved = limitOf(category.id);
            const draft = drafts[category.id];
            const value = draft ?? (saved === null || saved === 0 ? '' : formatCents(saved));

            return (
              <View key={category.id} style={{ gap: spacing.xs }}>
                <View style={styles.row}>
                  <Text style={{ fontSize: fontSize.md }}>{category.icon}</Text>
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}
                  >
                    {category.name}
                  </Text>
                  <TextInput
                    value={value}
                    onChangeText={(text) => setDrafts((c) => ({ ...c, [category.id]: text }))}
                    onBlur={() => commit(category.id)}
                    onSubmitEditing={() => commit(category.id)}
                    placeholder="nessun limite"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    accessibilityLabel={`Limite mensile per ${category.name}`}
                    style={{
                      width: 130,
                      textAlign: 'right',
                      color: colors.text,
                      fontSize: fontSize.sm,
                      backgroundColor: colors.background,
                      borderRadius: radius.md,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: colors.border,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                    }}
                  />
                </View>
                {status !== undefined && status.limitCents > 0 && (
                  <Text
                    style={{ color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'right' }}
                  >
                    Spesi {formatMoney(status.spentCents, symbol)}
                    {status.state === 'over'
                      ? ` · superato di ${formatMoney(-status.remainingCents, symbol)}`
                      : ` · restano ${formatMoney(status.remainingCents, symbol)}`}
                  </Text>
                )}
              </View>
            );
          })}
        </Card>

        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSize.xs,
            lineHeight: 18,
            paddingHorizontal: spacing.xs,
          }}
        >
          I limiti valgono per {formatMonthTitle(month)} e sono condivisi con l&apos;altro
          dispositivo. Lasciare vuoto un campo toglie il limite.
        </Text>
      </ScrollView>
    </ModalScreen>
  );
}

function Step({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  const { colors, fontSize } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint}
      hitSlop={12}
      style={{ paddingHorizontal: 8 }}
    >
      <Text style={{ color: colors.accent, fontSize: fontSize.lg }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
