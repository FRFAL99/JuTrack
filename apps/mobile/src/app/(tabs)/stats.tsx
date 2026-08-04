import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {
  budgetStatuses,
  computeBalances,
  formatCents,
  formatMoney,
  monthBounds,
  shiftMonth,
  simplifyDebts,
  totalCents,
  totalsByCategory,
  totalsByMonth,
} from '@jutrack/core';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { currentMonth, formatMonthTitle } from '@/features/expenses/grouping';
import { BudgetRows } from '@/features/stats/BudgetRows';
import { CategoryBars } from '@/features/stats/CategoryBars';
import { describeChange } from '@/features/stats/format';
import { MonthlyBars } from '@/features/stats/MonthlyBars';
import { useEngineActivity } from '@/features/sync/useEngineActivity';
import {
  useBudgets,
  useCategories,
  useCurrentGroup,
  useExpenses,
  useMembers,
  useSettlements,
} from '@/state';
import { useTheme } from '@/theme';

/** Quanti mesi mostra l'andamento: mezzo anno sta in larghezza senza comprimere le barre. */
const TREND_MONTHS = 6;

/**
 * I Grafici sono di **un** gruppo, e questo tab sta fuori da `app/(gruppo)/`.
 *
 * Aggregarli su più gruppi richiederebbe di montare più `Y.Doc` insieme, che è la scelta
 * architetturale che il progetto ha evitato dall'inizio: qui si guarda il gruppo aperto, e
 * se non ce n'è nessuno (Step 21) si dice così invece di mostrare zeri, che sarebbero una
 * risposta sbagliata a una domanda che non è stata posta.
 *
 * La guardia sta sopra il componente che lavora: tutti i suoi hook leggono il vault.
 */
export default function StatsScreen() {
  const { colors, spacing } = useTheme();
  const group = useCurrentGroup();

  if (group === null) {
    return (
      <Screen title="Grafici">
        <EmptyState
          icon={<Feather name="bar-chart-2" size={26} color={colors.textFaint} />}
          title="Nessun gruppo aperto"
          hint="I grafici raccontano le spese di un gruppo. Aprine uno, o creane uno, e qui compariranno andamento, categorie e saldo."
        />
        <View style={{ padding: spacing.lg }}>
          <Button label="I tuoi gruppi" onPress={() => router.push('/')} />
        </View>
      </Screen>
    );
  }

  return <StatsOfGroup />;
}

function StatsOfGroup() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const [month, setMonth] = useState(currentMonth);
  // Saldi e pareggi dipendono da quello che ha scritto l'altro telefono, non solo da noi.
  useEngineActivity();

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
  const atCurrentMonth = month >= currentMonth();

  if (allExpenses.length === 0) {
    return (
      <Screen title="Grafici">
        <EmptyState
          icon={<Feather name="bar-chart-2" size={26} color={colors.textFaint} />}
          title="Ancora nessun dato"
          hint="Andamento mensile, ripartizione per categoria e saldo tra di voi appariranno qui una volta registrate le prime spese."
        />
      </Screen>
    );
  }

  const monthHeader = (
    <View style={[styles.rowBetween, { paddingHorizontal: spacing.lg, paddingBottom: spacing.md }]}>
      <Pressable
        onPress={() => setMonth(shiftMonth(month, -1))}
        accessibilityRole="button"
        accessibilityLabel="Mese precedente"
        hitSlop={12}
      >
        <Feather name="chevron-left" size={22} color={colors.accent} />
      </Pressable>
      <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
        {formatMonthTitle(month)}
      </Text>
      <Pressable
        onPress={() => setMonth(shiftMonth(month, 1))}
        disabled={atCurrentMonth}
        accessibilityRole="button"
        accessibilityLabel="Mese successivo"
        accessibilityState={{ disabled: atCurrentMonth }}
        hitSlop={12}
      >
        <Feather
          name="chevron-right"
          size={22}
          color={atCurrentMonth ? colors.textFaint : colors.accent}
        />
      </Pressable>
    </View>
  );

  return (
    <Screen header={monthHeader}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, gap: 2 }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.display, fontWeight: fontWeight.heavy }}
          >
            {formatCents(monthTotal)} <Text style={{ color: colors.textMuted }}>€</Text>
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            {describeChange(monthTotal, previous, formatMonthTitle(shiftMonth(month, -1)))}
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <MonthlyBars months={trend} selected={month} onSelect={setMonth} />
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Dove sono finiti</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg }}>
          {byCategory.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              Nessuna spesa in {formatMonthTitle(month)}.
            </Text>
          ) : (
            <CategoryBars totals={byCategory} categories={categories} />
          )}
        </View>

        {members.length > 1 && (
          <>
            <Rule color={colors.border} />
            <SectionLabel>Fra di voi</SectionLabel>
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              {transfers.length === 0 ? (
                <View style={styles.rowBetween}>
                  <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}>
                    Siete pari. Nessuno deve niente a nessuno.
                  </Text>
                  <CompactButton label="Storico" onPress={() => router.push('/settle')} />
                </View>
              ) : (
                transfers.map((transfer, index) => (
                  <View
                    key={`${transfer.fromMember}-${transfer.toMember}`}
                    style={styles.rowBetween}
                  >
                    <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}>
                      {nameOf(transfer.fromMember)} deve{' '}
                      <Text style={{ color: colors.expense, fontWeight: fontWeight.semibold }}>
                        {formatMoney(transfer.amountCents)}
                      </Text>{' '}
                      a {nameOf(transfer.toMember)}
                    </Text>
                    {index === transfers.length - 1 && (
                      <CompactButton label="Pareggia" onPress={() => router.push('/settle')} />
                    )}
                  </View>
                ))
              )}
            </View>
          </>
        )}

        <Rule color={colors.border} />
        <View
          style={[
            styles.rowBetween,
            { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
          ]}
        >
          <Text
            style={{
              color: colors.textMuted,
              fontSize: fontSize.xxs,
              fontWeight: fontWeight.bold,
              letterSpacing: 1.3,
              textTransform: 'uppercase',
            }}
          >
            Budget
          </Text>
          <Pressable onPress={() => router.push('/budget')} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>Imposta</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
          {budgetState.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
              Nessun limite impostato per {formatMonthTitle(month)}. Un budget serve a sapere a metà
              mese se si sta esagerando, non a fine mese.
            </Text>
          ) : (
            <BudgetRows statuses={budgetState} categories={categories} />
          )}
        </View>

        <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }]}>
          <Feather name="lock" size={13} color={colors.textFaint} />
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            Calcolato su questo telefono
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Bottone secondario in miniatura: per un'azione che accompagna una riga di testo, non
 *  ne prende il posto. `Button` è pensato a piena larghezza — qui basta un tocco comodo. */
function CompactButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors, spacing, radius, fontSize, fontWeight } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View
          style={{
            backgroundColor: pressed ? colors.surfacePressed : colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            borderRadius: radius.md,
            paddingVertical: spacing.xs + 2,
            paddingHorizontal: spacing.md,
          }}
        >
          <Text
            style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Filetto che separa due blocchi del registro. */
function Rule({ color }: { color: string }) {
  const { spacing } = useTheme();
  return (
    <View
      style={{ height: StyleSheet.hairlineWidth, backgroundColor: color, marginTop: spacing.lg }}
    />
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
