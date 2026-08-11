import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import {
  amountFor,
  applyQuery,
  averagePerDay,
  binsFor,
  budgetStatuses,
  computeBalances,
  cumulativeByDay,
  dailyHeatmap,
  formatCents,
  formatMoney,
  monthBounds,
  monthsBetween,
  movingAverage,
  shiftMonth,
  simplifyDebts,
  totalCents,
  totalsByCategory,
  totalsByDay,
  totalsByMemberOverTime,
  totalsByMonth,
  totalsByStore,
  totalsByTag,
  totalsByWeekday,
  type ExpenseQuery,
} from '@jutrack/core';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import {
  currentMonth,
  formatMonthTitle,
  shortMonthLabel,
  todayIso,
} from '@/features/expenses/grouping';
import { BudgetRows } from '@/features/stats/BudgetRows';
import { CategoryBars } from '@/features/stats/CategoryBars';
import { AmountHistogram } from '@/features/stats/charts/AmountHistogram';
import { AreaChart } from '@/features/stats/charts/AreaChart';
import { CalendarHeatmap } from '@/features/stats/charts/CalendarHeatmap';
import { CategoryTreemap } from '@/features/stats/charts/CategoryTreemap';
import { DonutChart } from '@/features/stats/charts/DonutChart';
import { LineChart } from '@/features/stats/charts/LineChart';
import { MemberComparison } from '@/features/stats/charts/MemberComparison';
import { StatTile } from '@/features/stats/charts/StatTile';
import { topSlices, type Slice } from '@/features/stats/charts/slices';
import { TopList } from '@/features/stats/charts/TopList';
import { WeekdayBars } from '@/features/stats/charts/WeekdayBars';
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

/** Quanti mesi mostra l'andamento a barre: mezzo anno sta in larghezza senza comprimerle. */
const TREND_MONTHS = 6;
/** Quanti ne mostra la linea, e su quanti si legge l'abitudine settimanale. */
const YEAR_MONTHS = 12;
/** Giorni della media mobile: una settimana intera, così il sabato non fa un gradino. */
const SMOOTHING_DAYS = 7;
/** Quante voci al più nella ciambella e nelle classifiche. */
const TOP_SLICES = 5;

/**
 * **La domanda che si fa a questi grafici, per ora, è sempre la stessa.**
 *
 * Lo Step 27 la renderà componibile con i sei filtri; qui è vuota, e con la query vuota
 * `amountFor` restituisce l'importo pieno — cioè esattamente quello che la schermata
 * mostrava prima. Passarla comunque, invece di leggere `amountCents`, è ciò che permetterà
 * di sostituirla senza rileggere ogni grafico.
 */
const NO_FILTER: ExpenseQuery = {};

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

  const monthTotal = totalCents(monthExpenses, NO_FILTER);
  const byCategory = useMemo(() => totalsByCategory(monthExpenses, NO_FILTER), [monthExpenses]);

  const trend = useMemo(
    () =>
      totalsByMonth(allExpenses, {
        from: shiftMonth(month, -(TREND_MONTHS - 1)),
        to: month,
      }),
    [allExpenses, month],
  );

  const trendYear = useMemo(
    () =>
      totalsByMonth(allExpenses, {
        from: shiftMonth(month, -(YEAR_MONTHS - 1)),
        to: month,
      }),
    [allExpenses, month],
  );

  /**
   * L'ultimo giorno che ha senso disegnare.
   *
   * Sul mese in corso è **oggi**, non la fine del mese: una curva che prosegue piatta fino
   * al 31 non dice «non ho ancora speso», dice «non spenderò», e sono due frasi diverse.
   */
  const lastDay = month >= currentMonth() ? todayIso() : bounds.to;

  const days = useMemo(
    () => totalsByDay(monthExpenses, NO_FILTER, { from: bounds.from, to: lastDay }),
    [monthExpenses, bounds.from, lastDay],
  );
  const cumulative = useMemo(() => cumulativeByDay(days), [days]);
  const smoothed = useMemo(
    () =>
      movingAverage(
        days.map((day) => day.totalCents),
        SMOOTHING_DAYS,
      ),
    [days],
  );

  // La heatmap copre il **mese intero** anche quando è in corso: i giorni che restano si
  // vedono spenti, ed è l'informazione che dice a che punto del mese si è.
  const heat = useMemo(
    () => dailyHeatmap(monthExpenses, bounds.from, bounds.to, NO_FILTER),
    [monthExpenses, bounds.from, bounds.to],
  );

  const bins = useMemo(
    () => binsFor(monthExpenses.map((expense) => amountFor(expense, NO_FILTER))),
    [monthExpenses],
  );

  // L'abitudine settimanale su un mese solo sarebbe rumore: si guarda su un anno.
  const yearExpenses = useMemo(
    () =>
      applyQuery(allExpenses, {
        from: `${shiftMonth(month, -(YEAR_MONTHS - 1))}-01`,
        to: bounds.to,
      }),
    [allExpenses, month, bounds.to],
  );
  const weekdays = useMemo(() => totalsByWeekday(yearExpenses, NO_FILTER), [yearExpenses]);

  const stores = useMemo(() => totalsByStore(monthExpenses, NO_FILTER), [monthExpenses]);
  const tags = useMemo(() => totalsByTag(monthExpenses, NO_FILTER), [monthExpenses]);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const paidThisMonth = useMemo(
    () => totalsByMemberOverTime(monthExpenses, memberIds, [month]),
    [monthExpenses, memberIds, month],
  );
  const overTheYear = useMemo(
    () =>
      totalsByMemberOverTime(
        yearExpenses,
        memberIds,
        monthsBetween(shiftMonth(month, -(YEAR_MONTHS - 1)), month),
      ),
    [yearExpenses, memberIds, month],
  );

  // Il saldo è cumulativo su tutta la storia, non sul mese scelto: un debito non si
  // azzera al cambio di pagina del calendario.
  const transfers = useMemo(
    () => simplifyDebts(computeBalances(allExpenses, settlements, memberIds)),
    [allExpenses, settlements, memberIds],
  );

  const budgetState = useMemo(
    () => budgetStatuses(budgets, monthExpenses, month),
    [budgets, monthExpenses, month],
  );

  const previous = trend[trend.length - 2]?.totalCents ?? 0;
  const nameOf = (id: string): string => members.find((m) => m.id === id)?.name ?? 'qualcuno';
  const colorOf = (id: string): string => members.find((m) => m.id === id)?.color ?? colors.accent;
  const atCurrentMonth = month >= currentMonth();
  const monthLabel = formatMonthTitle(month);

  const categorySlices: Slice[] = byCategory.map((total) => {
    const category = total.categoryId === null ? undefined : byId(categories, total.categoryId);
    return {
      key: total.categoryId ?? 'none',
      label: category?.name ?? 'Senza categoria',
      valueCents: total.totalCents,
      color: category?.color ?? colors.textMuted,
    };
  });

  const paidSlices: Slice[] = paidThisMonth
    .filter((one) => one.paidCents > 0)
    .map((one) => ({
      key: one.memberId,
      label: nameOf(one.memberId),
      valueCents: one.paidCents,
      color: colorOf(one.memberId),
    }));

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
        {monthLabel}
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

        <View style={[styles.tiles, { paddingHorizontal: spacing.sm, paddingTop: spacing.lg }]}>
          <StatTile
            label="Al giorno"
            value={formatMoney(averagePerDay(days))}
            hint={`su ${days.length} ${days.length === 1 ? 'giorno' : 'giorni'}`}
            values={days.map((day) => day.totalCents)}
            sparklineLabel={`Andamento giornaliero di ${monthLabel}`}
          />
          <Divider color={colors.divider} />
          <StatTile
            label="Spese"
            value={String(monthExpenses.length)}
            hint={monthExpenses.length === 1 ? 'registrata' : 'registrate'}
          />
          <Divider color={colors.divider} />
          <StatTile
            label="A spesa"
            value={formatMoney(
              monthExpenses.length === 0 ? 0 : Math.round(monthTotal / monthExpenses.length),
            )}
            hint="in media"
          />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <MonthlyBars months={trend} selected={month} onSelect={setMonth} />
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Giorno per giorno</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <LineChart
            points={days.map((day) => ({
              key: day.date,
              label: dayLabel(day.date),
              valueCents: day.totalCents,
            }))}
            overlayCents={smoothed}
            overlayLabel={`Media dei ${SMOOTHING_DAYS} giorni precedenti`}
          />
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Quanto si è accumulato</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <AreaChart
            points={cumulative.map((day) => ({
              key: day.date,
              label: dayLabel(day.date),
              valueCents: day.totalCents,
            }))}
            {...(previous > 0 && {
              referenceCents: previous,
              referenceLabel: `Totale di ${formatMonthTitle(shiftMonth(month, -1))}`,
            })}
          />
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Quando si è speso</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <CalendarHeatmap cells={heat} />
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Dodici mesi</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <LineChart
            points={trendYear.map((one) => ({
              key: one.month,
              label: shortMonthLabel(one.month),
              valueCents: one.totalCents,
            }))}
            smooth
            dots
            maxLabels={6}
          />
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Giorni della settimana</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <WeekdayBars totals={weekdays} />
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            Sugli ultimi dodici mesi: su un mese solo sarebbero sette numeri a caso.
          </Text>
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Dove sono finiti</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
          {byCategory.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              Nessuna spesa in {monthLabel}.
            </Text>
          ) : (
            <>
              <CategoryTreemap items={categorySlices} />
              <CategoryBars totals={byCategory} categories={categories} />
            </>
          )}
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Quante spese, per fascia</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <AmountHistogram bins={bins} />
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            L'altezza è il numero di spese, non la somma: dice se si fanno tanti scontrini piccoli o
            pochi grossi.
          </Text>
        </View>

        {members.length > 1 && paidSlices.length > 0 && (
          <>
            <Rule color={colors.border} />
            <SectionLabel>Chi ha anticipato</SectionLabel>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <DonutChart
                slices={topSlices(paidSlices, TOP_SLICES, colors.textMuted)}
                centerLabel={`Anticipato in ${monthLabel}`}
              />
            </View>
          </>
        )}

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

            <Rule color={colors.border} />
            <SectionLabel>Anticipato e a carico</SectionLabel>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <MemberComparison
                series={overTheYear}
                members={members}
                periodLabel="negli ultimi dodici mesi"
              />
            </View>
          </>
        )}

        {stores.length > 0 && (
          <>
            <Rule color={colors.border} />
            <SectionLabel>Negozi</SectionLabel>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <TopList
                totals={stores}
                max={TOP_SLICES}
                note="Le spese senza negozio non compaiono: questa classifica somma meno del totale del mese."
              />
            </View>
          </>
        )}

        {tags.length > 0 && (
          <>
            <Rule color={colors.border} />
            <SectionLabel>Tag</SectionLabel>
            <View style={{ paddingHorizontal: spacing.lg }}>
              <TopList
                totals={tags}
                max={TOP_SLICES}
                note="Una spesa con due tag conta per intero in entrambi: qui la somma può superare il totale del mese."
              />
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
              Nessun limite impostato per {monthLabel}. Un budget serve a sapere a metà mese se si
              sta esagerando, non a fine mese.
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

/** Il giorno del mese, senza lo zero davanti: sotto una linea ci stanno due cifre. */
function dayLabel(date: string): string {
  return String(Number(date.slice(8, 10)));
}

function byId(
  categories: { id: string; name: string; color: string }[],
  id: string,
): { id: string; name: string; color: string } | undefined {
  return categories.find((category) => category.id === id);
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

/** Filetto verticale fra due riquadri di riepilogo. */
function Divider({ color }: { color: string }) {
  return <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tiles: { flexDirection: 'row', alignItems: 'stretch' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
