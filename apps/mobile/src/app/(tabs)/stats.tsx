import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  budgetStatuses,
  computeBalances,
  formatMoney,
  monthBounds,
  shiftMonth,
  simplifyDebts,
  totalCents,
  totalsByCategory,
  totalsByMonth,
} from '@jutrack/core';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { currentMonth, formatMonthTitle } from '@/features/expenses/grouping';
import { BudgetRows } from '@/features/stats/BudgetRows';
import { CategoryBars } from '@/features/stats/CategoryBars';
import { describeChange } from '@/features/stats/format';
import { MonthlyBars } from '@/features/stats/MonthlyBars';
import { useBudgets, useCategories, useExpenses, useMembers, useSettlements } from '@/state';
import { useTheme } from '@/theme';

/** Quanti mesi mostra l'andamento: mezzo anno sta in larghezza senza comprimere le barre. */
const TREND_MONTHS = 6;

export default function StatsScreen() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const [month, setMonth] = useState(currentMonth);

  const bounds = monthBounds(month);
  const monthExpenses = useExpenses({ from: bounds.from, to: bounds.to });
  const allExpenses = useExpenses();
  const categories = useCategories(true);
  const members = useMembers();
  const settlements = useSettlements();
  const budgets = useBudgets(month);

  const monthTotal = totalCents(monthExpenses);
  const byCategory = useMemo(() => totalsByCategory(monthExpenses), [monthExpenses]);

  const trend = useMemo(
    () =>
      totalsByMonth(allExpenses, {
        from: shiftMonth(month, -(TREND_MONTHS - 1)),
        to: month,
      }),
    [allExpenses, month],
  );

  // Il saldo è cumulativo su tutta la storia, non sul mese scelto: un debito non si
  // azzera al cambio di pagina del calendario.
  const transfers = useMemo(
    () =>
      simplifyDebts(
        computeBalances(
          allExpenses,
          settlements,
          members.map((m) => m.id),
        ),
      ),
    [allExpenses, settlements, members],
  );

  const budgetState = useMemo(
    () => budgetStatuses(budgets, monthExpenses, month),
    [budgets, monthExpenses, month],
  );

  const previous = trend[trend.length - 2]?.totalCents ?? 0;
  const nameOf = (id: string): string => members.find((m) => m.id === id)?.name ?? 'qualcuno';

  if (allExpenses.length === 0) {
    return (
      <Screen title="Statistiche">
        <EmptyState
          icon="📊"
          title="Ancora nessun dato"
          hint="Andamento mensile, ripartizione per categoria e saldo tra di voi appariranno qui una volta registrate le prime spese."
        />
      </Screen>
    );
  }

  return (
    <Screen title="Statistiche">
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.md }}>
          <View style={styles.rowBetween}>
            <MonthStep
              label="‹"
              hint="Mese precedente"
              onPress={() => setMonth(shiftMonth(month, -1))}
            />
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              {formatMonthTitle(month)}
            </Text>
            <MonthStep
              label="›"
              hint="Mese successivo"
              onPress={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= currentMonth()}
            />
          </View>

          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.bold }}
            >
              {formatMoney(monthTotal)}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              {describeChange(monthTotal, previous, formatMonthTitle(shiftMonth(month, -1)))}
            </Text>
          </View>
        </Card>

        {members.length > 1 && (
          <Card style={{ gap: spacing.sm }}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Fra di voi
            </Text>
            {transfers.length === 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
                Siete pari. Nessuno deve niente a nessuno.
              </Text>
            ) : (
              transfers.map((transfer) => (
                <Text
                  key={`${transfer.fromMember}-${transfer.toMember}`}
                  style={{ color: colors.text, fontSize: fontSize.md, lineHeight: 24 }}
                >
                  {nameOf(transfer.fromMember)} deve{' '}
                  <Text style={{ fontWeight: fontWeight.semibold }}>
                    {formatMoney(transfer.amountCents)}
                  </Text>{' '}
                  a {nameOf(transfer.toMember)}
                </Text>
              ))
            )}
            <Button
              label={transfers.length === 0 ? 'Storico dei pareggi' : 'Registra un pareggio'}
              variant="secondary"
              onPress={() => router.push('/settle')}
            />
          </Card>
        )}

        <Card style={{ gap: spacing.md }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Ultimi {TREND_MONTHS} mesi
          </Text>
          <MonthlyBars months={trend} selected={month} onSelect={setMonth} />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
          >
            Dove sono finiti
          </Text>
          {byCategory.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              Nessuna spesa in {formatMonthTitle(month)}.
            </Text>
          ) : (
            <CategoryBars totals={byCategory} categories={categories} />
          )}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={styles.rowBetween}>
            <Text
              style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}
            >
              Budget
            </Text>
            <Pressable
              onPress={() => router.push('/budget')}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>Imposta</Text>
            </Pressable>
          </View>
          {budgetState.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 }}>
              Nessun limite impostato per {formatMonthTitle(month)}. Un budget serve a sapere a metà
              mese se si sta esagerando, non a fine mese.
            </Text>
          ) : (
            <BudgetRows statuses={budgetState} categories={categories} />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function MonthStep({
  label,
  hint,
  onPress,
  disabled = false,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, fontSize } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint}
      accessibilityState={{ disabled }}
      hitSlop={12}
      style={{ paddingHorizontal: 8, opacity: disabled ? 0.3 : 1 }}
    >
      <Text style={{ color: colors.accent, fontSize: fontSize.lg }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
