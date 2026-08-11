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
  isEmptyQuery,
  knownStores,
  knownTags,
  monthBounds,
  monthsBetween,
  movingAverage,
  queryTotalCents,
  shiftMonth,
  simplifyDebts,
  totalsByCategory,
  totalsByDay,
  totalsByMemberOverTime,
  totalsByMonth,
  totalsByStore,
  totalsByTag,
  totalsByWeekday,
  type ExpenseQuery,
  type QueryLabels,
} from '@jutrack/core';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SectionLabel } from '@/components/SectionLabel';
import { formatMonthTitle, shortMonthLabel, todayIso } from '@/features/expenses/grouping';
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
import type { QueryFacets } from '@/features/stats/filters/facets';
import { FilterBar } from '@/features/stats/filters/FilterBar';
import { FilterSheet } from '@/features/stats/filters/FilterSheet';
import {
  anchorMonth,
  defaultPeriod,
  describeRange,
  monthPeriod,
  previousPeriod,
  startsAtMonthStart,
  type Period,
} from '@/features/stats/filters/period';
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

/**
 * **Una domanda sola, che alimenta tutti i grafici.**
 *
 * Il periodo e i cinque filtri compongono un unico `ExpenseQuery`: passarli uno per uno a
 * ciascun widget sarebbe il modo più rapido per averne uno che ne ignora uno, e un grafico
 * che risponde a una domanda diversa dagli altri non si riconosce guardandolo — i numeri
 * restano plausibili.
 *
 * **Le letture dal documento sono due, non una per grafico.** `listExpenses` è una scansione
 * lineare che alloca un array nuovo a ogni chiamata: una lettura ristretta al periodo (è
 * l'unico filtro che conviene far fare allo store, perché restringe la scansione) e una
 * completa, che serve al saldo — cumulativo su tutta la storia — e alla finestra di dodici
 * mesi. Tutto il resto passa da `applyQuery` in due `useMemo`.
 */
function StatsOfGroup() {
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [facets, setFacets] = useState<QueryFacets>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  // Saldi e pareggi dipendono da quello che ha scritto l'altro telefono, non solo da noi.
  useEngineActivity();

  const categories = useCategories(true);
  const members = useMembers();
  const settlements = useSettlements();

  const anchor = anchorMonth(period);
  const anchorBounds = monthBounds(anchor);
  const budgets = useBudgets(anchor);

  const periodExpenses = useExpenses({ from: period.from, to: period.to });
  const allExpenses = useExpenses();

  /**
   * La domanda intera. `facets` non ha `from`/`to`: li mette il periodo, qui e solo qui.
   */
  const query: ExpenseQuery = useMemo(
    () => ({ ...facets, from: period.from, to: period.to }),
    [facets, period],
  );

  const filtered = useMemo(() => applyQuery(periodExpenses, query), [periodExpenses, query]);

  /**
   * La finestra di dodici mesi, per i grafici che dichiarano la propria nel titolo.
   *
   * Rispettano i **filtri** ma non il **periodo**: «giorni della settimana» su un mese solo
   * sarebbe rumore, e «dodici mesi» che ne mostra sette perché il periodo è corto sarebbe
   * un titolo falso. Il periodo decide *dove si guarda*, questi dicono da quanto lontano.
   *
   * Ricevono `facets` e non `query` come proiezione: `amountFor` legge solo persona e
   * modalità, ma `totalsByDay` userebbe `query.from`/`query.to` come estremi di ripiego, e
   * sarebbero gli estremi sbagliati.
   */
  const yearFrom = `${shiftMonth(anchor, -(YEAR_MONTHS - 1))}-01`;
  const yearExpenses = useMemo(
    () => applyQuery(allExpenses, { ...facets, from: yearFrom, to: anchorBounds.to }),
    [allExpenses, facets, yearFrom, anchorBounds.to],
  );

  const periodTotal = queryTotalCents(filtered, query);

  const previous = useMemo(() => {
    const before = previousPeriod(period);
    return queryTotalCents(applyQuery(allExpenses, { ...facets, ...before }), facets);
  }, [allExpenses, facets, period]);

  const byCategory = useMemo(() => totalsByCategory(filtered, query), [filtered, query]);

  const trend = useMemo(
    () =>
      totalsByMonth(
        yearExpenses,
        { from: shiftMonth(anchor, -(TREND_MONTHS - 1)), to: anchor },
        facets,
      ),
    [yearExpenses, anchor, facets],
  );

  const trendYear = useMemo(
    () =>
      totalsByMonth(
        yearExpenses,
        { from: shiftMonth(anchor, -(YEAR_MONTHS - 1)), to: anchor },
        facets,
      ),
    [yearExpenses, anchor, facets],
  );

  const days = useMemo(() => totalsByDay(filtered, query), [filtered, query]);
  const cumulative = useMemo(() => cumulativeByDay(days), [days]);
  const smoothed = useMemo(
    () =>
      movingAverage(
        days.map((day) => day.totalCents),
        SMOOTHING_DAYS,
      ),
    [days],
  );

  /**
   * La heatmap del mese in corso copre il **mese intero**, non solo fino a oggi.
   *
   * I giorni che restano si vedono spenti, ed è l'informazione che dice a che punto del mese
   * si è. Vale solo per «questo mese»: estendere un intervallo scelto a mano vorrebbe dire
   * mostrare giorni che nessuno ha chiesto.
   */
  const heatTo = period.id === 'thisMonth' ? anchorBounds.to : period.to;
  const heat = useMemo(
    () => dailyHeatmap(filtered, period.from, heatTo, query),
    [filtered, period.from, heatTo, query],
  );

  const bins = useMemo(
    () => binsFor(filtered.map((expense) => amountFor(expense, query))),
    [filtered, query],
  );

  const weekdays = useMemo(() => totalsByWeekday(yearExpenses, facets), [yearExpenses, facets]);

  const stores = useMemo(() => totalsByStore(filtered, query), [filtered, query]);
  const tags = useMemo(() => totalsByTag(filtered, query), [filtered, query]);

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const paidInPeriod = useMemo(
    () =>
      totalsByMemberOverTime(filtered, memberIds, monthsBetween(period.from.slice(0, 7), anchor)),
    [filtered, memberIds, period.from, anchor],
  );
  const overTheYear = useMemo(
    () =>
      totalsByMemberOverTime(
        yearExpenses,
        memberIds,
        monthsBetween(shiftMonth(anchor, -(YEAR_MONTHS - 1)), anchor),
      ),
    [yearExpenses, memberIds, anchor],
  );

  /**
   * Il saldo **non passa dai filtri**, e il budget nemmeno.
   *
   * Sono due fatti sul gruppo, non due viste: chi deve quanto a chi non cambia perché si sta
   * guardando una categoria, e «speso 40 € di 200» diventerebbe falso filtrando per persona.
   * Il saldo è poi cumulativo su tutta la storia — un debito non si azzera al cambio di
   * pagina del calendario — e `budgetStatuses` sceglie da sé il mese che le interessa.
   */
  const transfers = useMemo(
    () => simplifyDebts(computeBalances(allExpenses, settlements, memberIds)),
    [allExpenses, settlements, memberIds],
  );

  const budgetState = useMemo(
    () => budgetStatuses(budgets, allExpenses, anchor),
    [budgets, allExpenses, anchor],
  );

  // Il vocabolario del gruppo si deriva in lettura dalle spese, non da due entità: un
  // negozio esiste finché esiste una spesa che lo nomina. Su tutte le spese e non su quelle
  // filtrate, o filtrando per un negozio sparirebbero tutti gli altri dal foglio.
  const storeNames = useMemo(() => knownStores(allExpenses), [allExpenses]);
  const tagNames = useMemo(() => knownTags(allExpenses), [allExpenses]);

  const nameOf = (id: string): string => members.find((m) => m.id === id)?.name ?? 'qualcuno';
  const colorOf = (id: string): string => members.find((m) => m.id === id)?.color ?? colors.accent;
  const periodTitle = describeRange(period.from, period.to);

  const labels: QueryLabels = useMemo(
    () => ({
      category: (id) => categories.find((one) => one.id === id)?.name ?? 'categoria',
      member: (id) => members.find((one) => one.id === id)?.name ?? 'qualcuno',
    }),
    [categories, members],
  );

  const filtering = !isEmptyQuery(facets);
  const reset = () => setFacets({});

  const categorySlices: Slice[] = byCategory.map((total) => {
    const category = total.categoryId === null ? undefined : byId(categories, total.categoryId);
    return {
      key: total.categoryId ?? 'none',
      label: category?.name ?? 'Senza categoria',
      valueCents: total.totalCents,
      color: category?.color ?? colors.textMuted,
    };
  });

  const paidSlices: Slice[] = paidInPeriod
    .filter((one) => one.paidCents > 0)
    .map((one) => ({
      key: one.memberId,
      label: nameOf(one.memberId),
      valueCents: one.paidCents,
      color: colorOf(one.memberId),
    }));

  const header = (
    <View style={{ paddingBottom: spacing.md }}>
      <FilterBar
        period={period}
        facets={facets}
        labels={labels}
        onOpen={() => setSheetOpen(true)}
        onReset={reset}
      />
    </View>
  );

  const sheet = (
    <FilterSheet
      visible={sheetOpen}
      onClose={() => setSheetOpen(false)}
      period={period}
      onPeriodChange={setPeriod}
      facets={facets}
      onFacetsChange={setFacets}
      categories={categories}
      members={members}
      stores={storeNames}
      tags={tagNames}
      matchCount={filtered.length}
      today={todayIso()}
    />
  );

  if (allExpenses.length === 0) {
    return (
      <Screen title="Grafici">
        <EmptyState
          icon={<Feather name="bar-chart-2" size={26} color={colors.textFaint} />}
          title="Ancora nessun dato"
          hint="Andamento, ripartizione per categoria e saldo tra di voi appariranno qui una volta registrate le prime spese."
        />
      </Screen>
    );
  }

  /**
   * Niente da mostrare **non è la stessa cosa di tutto a zero**.
   *
   * Undici grafici disegnati su una lista vuota sono undici forme piatte che si leggono come
   * un dato — «non ho speso niente» — e non come «la domanda non ha risposte». La barra
   * resta in cima, così si vede *quale* domanda è stata posta, e «azzera i filtri» è lì
   * accanto: è il caso in cui un filtro dimenticato fa sembrare guasta l'app.
   */
  if (filtered.length === 0) {
    return (
      <Screen header={header}>
        <EmptyState
          icon={<Feather name="filter" size={26} color={colors.textFaint} />}
          title={filtering ? 'Nessuna spesa con questi filtri' : `Nessuna spesa in ${periodTitle}`}
          hint={
            filtering
              ? 'I filtri valgono per tutti i grafici insieme. Toglierne uno, o allargare il periodo, li fa ricomparire.'
              : 'Scegli un periodo più largo, oppure registra una spesa in questi giorni.'
          }
        />
        {filtering && (
          <View style={{ padding: spacing.lg }}>
            <Button label="Azzera i filtri" onPress={reset} />
          </View>
        )}
        {sheet}
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, gap: 2 }}>
          <Text
            style={{ color: colors.text, fontSize: fontSize.display, fontWeight: fontWeight.heavy }}
          >
            {formatCents(periodTotal)} <Text style={{ color: colors.textMuted }}>€</Text>
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            {describeChange(periodTotal, previous, previousLabel(period))}
          </Text>
        </View>

        <View style={[styles.tiles, { paddingHorizontal: spacing.sm, paddingTop: spacing.lg }]}>
          <StatTile
            label="Al giorno"
            value={formatMoney(averagePerDay(days))}
            hint={`su ${days.length} ${days.length === 1 ? 'giorno' : 'giorni'}`}
            values={days.map((day) => day.totalCents)}
            sparklineLabel={`Andamento giornaliero di ${periodTitle}`}
          />
          <Divider color={colors.divider} />
          <StatTile
            label="Spese"
            value={String(filtered.length)}
            hint={filtered.length === 1 ? 'registrata' : 'registrate'}
          />
          <Divider color={colors.divider} />
          <StatTile
            label="A spesa"
            value={formatMoney(
              filtered.length === 0 ? 0 : Math.round(periodTotal / filtered.length),
            )}
            hint="in media"
          />
        </View>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm }}>
          {/* Toccare una barra sceglie quel mese come periodo: è anche il modo di andare
              indietro nel tempo più di quanto facciano i preset, e ha preso il posto dello
              stepper del mese, che diceva la stessa cosa mostrando un mese solo. */}
          <MonthlyBars
            months={trend}
            selected={anchor}
            onSelect={(month) => setPeriod(monthPeriod(month))}
          />
          {!startsAtMonthStart(period) && (
            <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
              I mesi sono interi, anche quando il periodo scelto è più corto.
            </Text>
          )}
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
              referenceLabel: `Totale di ${previousLabel(period)}`,
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
            Sugli ultimi dodici mesi, non sul periodo scelto: su un mese solo sarebbero sette numeri
            a caso.
          </Text>
        </View>

        <Rule color={colors.border} />
        <SectionLabel>Dove sono finiti</SectionLabel>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
          <CategoryTreemap items={categorySlices} />
          <CategoryBars totals={byCategory} categories={categories} />
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
                centerLabel={`Anticipato in ${periodTitle}`}
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
              <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
                Su tutta la storia del gruppo, filtri esclusi: un debito non si azzera cambiando
                periodo.
              </Text>
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
                note="Le spese senza negozio non compaiono: questa classifica somma meno del totale del periodo."
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
                note="Una spesa con due tag conta per intero in entrambi: qui la somma può superare il totale del periodo."
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
            Budget di {formatMonthTitle(anchor)}
          </Text>
          <Pressable onPress={() => router.push('/budget')} accessibilityRole="button" hitSlop={8}>
            <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>Imposta</Text>
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
          {budgetState.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
              Nessun limite impostato per {formatMonthTitle(anchor)}. Un budget serve a sapere a
              metà mese se si sta esagerando, non a fine mese.
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

      {sheet}
    </Screen>
  );
}

/** Come si chiama il tratto con cui il periodo si confronta: «rispetto a luglio». */
function previousLabel(period: Period): string {
  const before = previousPeriod(period);
  return describeRange(before.from, before.to);
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
