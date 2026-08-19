import { useMemo, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
import { formatMoney } from '@/i18n/money';
import { plural } from '@/i18n/translate';
import { HeroAmount } from '@/components/HeroAmount';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
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
import { DashboardWidget } from '@/features/stats/dashboard/DashboardWidget';
import { visibleWidgets } from '@/features/stats/dashboard/layout';
import { useDashboardLayout } from '@/features/stats/dashboard/useDashboardLayout';
import {
  unmetNeeds,
  widgetSpec,
  type GroupFacts,
  type WidgetId,
} from '@/features/stats/dashboard/widgets';
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
  useCurrencySymbol,
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
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const group = useCurrentGroup();

  if (group === null) {
    return (
      <Screen title={t('tabs.charts')}>
        <EmptyState
          icon={<Feather name="bar-chart-2" size={26} color={colors.textFaint} />}
          title={t('stats.noGroupTitle')}
          hint={t('stats.noGroupHint')}
        />
        <View style={{ padding: spacing.lg }}>
          <Button label={t('groups.title')} onPress={() => router.push('/')} />
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
  const { t } = useTranslation();
  const { colors, spacing, fontSize, fontWeight } = useTheme();
  const symbol = useCurrencySymbol();
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [facets, setFacets] = useState<QueryFacets>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const { layout, ready } = useDashboardLayout();
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

  const nameOf = (id: string): string =>
    members.find((m) => m.id === id)?.name ?? t('common.someone');
  const colorOf = (id: string): string => members.find((m) => m.id === id)?.color ?? colors.accent;
  const periodTitle = describeRange(period.from, period.to);

  const labels: QueryLabels = useMemo(
    () => ({
      category: (id) =>
        categories.find((one) => one.id === id)?.name ?? t('stats.categoryFallback'),
      member: (id) => members.find((one) => one.id === id)?.name ?? t('common.someone'),
    }),
    [categories, members, t],
  );

  const filtering = !isEmptyQuery(facets);
  const reset = () => setFacets({});

  const categorySlices: Slice[] = byCategory.map((total) => {
    const category = total.categoryId === null ? undefined : byId(categories, total.categoryId);
    return {
      key: total.categoryId ?? 'none',
      label: category?.name ?? t('expense.row.uncategorized'),
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

  /**
   * La barra dei filtri scorre, il pulsante che compone no.
   *
   * «Componi» sta **fuori** dalla `ScrollView` orizzontale: dentro finirebbe in coda ai
   * chip, cioè fuori dallo schermo appena i filtri attivi sono due — e sarebbe l'unico modo
   * di riaccendere i widget, nascosto proprio a chi li ha spenti tutti.
   */
  const header = (
    <View style={[styles.rowBetween, { paddingBottom: spacing.md }]}>
      <View style={{ flex: 1 }}>
        <FilterBar
          period={period}
          facets={facets}
          labels={labels}
          onOpen={() => setSheetOpen(true)}
          onReset={reset}
        />
      </View>
      <Pressable
        onPress={() => router.push('/dashboard')}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.title')}
        hitSlop={10}
        style={{ paddingHorizontal: spacing.lg }}
      >
        <Feather name="grid" size={18} color={colors.textMuted} />
      </Pressable>
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
      <Screen title={t('tabs.charts')}>
        <EmptyState
          icon={<Feather name="bar-chart-2" size={26} color={colors.textFaint} />}
          title={t('stats.noDataTitle')}
          hint={t('stats.noDataHint')}
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
          title={
            filtering
              ? t('stats.emptyFilteredTitle')
              : t('stats.emptyPeriodTitle', { period: periodTitle })
          }
          hint={filtering ? t('stats.emptyFilteredHint') : t('stats.emptyPeriodHint')}
        />
        {filtering && (
          <View style={{ padding: spacing.lg }}>
            <Button label={t('stats.filters.resetA11y')} onPress={reset} />
          </View>
        )}
        {sheet}
      </Screen>
    );
  }

  const facts: GroupFacts = {
    members: members.length,
    stores: storeNames.length,
    tags: tagNames.length,
  };

  /**
   * **Il contenuto di ogni widget, staccato dall'ordine in cui compare.**
   *
   * Era una sequenza scritta nel file, ed è diventata una mappa che il layout percorre. Il
   * costo è che i nodi si costruiscono tutti e sedici anche quando la dashboard ne mostra
   * tre: creare un elemento React non lo disegna — solo entrare nell'albero lo fa — e i
   * calcoli sono quelli di prima, già tutti dentro `useMemo` sopra. Il guadagno è che
   * l'ordine sta in un posto solo, `layout.ts`, invece che nella sequenza del JSX.
   *
   * `empty` distingue **«non ho niente da dire in questo periodo»** da «non ho dati del
   * tutto», che è `unmet` e riguarda il gruppo: le due frasi mandano a fare due cose
   * diverse. Un grafico disegnato su zero direbbe invece una terza cosa, falsa.
   */
  const content: Record<WidgetId, { node: ReactNode; empty?: boolean }> = {
    total: {
      node: (
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, gap: 2 }}>
          <HeroAmount
            cents={periodTotal}
            symbol={symbol}
            symbolColor={colors.textMuted}
            style={{ color: colors.text, fontSize: fontSize.display, fontWeight: fontWeight.heavy }}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
            {describeChange(periodTotal, previous, previousLabel(period))}
          </Text>
        </View>
      ),
    },

    tiles: {
      node: (
        <View style={[styles.tiles, { paddingHorizontal: spacing.sm }]}>
          <StatTile
            label={t('stats.tiles.perDay')}
            value={formatMoney(averagePerDay(days), symbol)}
            hint={plural('stats.tiles.perDayHint', days.length)}
            values={days.map((day) => day.totalCents)}
            sparklineLabel={t('stats.tiles.dailyTrend', { period: periodTitle })}
          />
          <Divider color={colors.divider} />
          <StatTile
            label={t('stats.tiles.expenses')}
            value={String(filtered.length)}
            hint={plural('stats.tiles.recordedHint', filtered.length)}
          />
          <Divider color={colors.divider} />
          <StatTile
            label={t('stats.tiles.perExpense')}
            value={formatMoney(Math.round(periodTotal / filtered.length), symbol)}
            hint={t('stats.tiles.average')}
          />
        </View>
      ),
    },

    months: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
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
              {t('stats.monthsWholeNote')}
            </Text>
          )}
        </View>
      ),
    },

    daily: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <LineChart
            points={days.map((day) => ({
              key: day.date,
              label: dayLabel(day.date),
              valueCents: day.totalCents,
            }))}
            overlayCents={smoothed}
            overlayLabel={t('stats.dailyOverlayLabel', { days: SMOOTHING_DAYS })}
          />
        </View>
      ),
    },

    cumulative: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <AreaChart
            points={cumulative.map((day) => ({
              key: day.date,
              label: dayLabel(day.date),
              valueCents: day.totalCents,
            }))}
            {...(previous > 0 && {
              referenceCents: previous,
              referenceLabel: t('stats.cumulativeReferenceLabel', {
                period: previousLabel(period),
              }),
            })}
          />
        </View>
      ),
    },

    heatmap: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <CalendarHeatmap cells={heat} />
        </View>
      ),
    },

    year: {
      node: (
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
      ),
    },

    weekdays: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <WeekdayBars totals={weekdays} />
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('stats.weekdaysNote')}
          </Text>
        </View>
      ),
    },

    categories: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
          <CategoryTreemap items={categorySlices} />
          <CategoryBars totals={byCategory} categories={categories} />
        </View>
      ),
    },

    amounts: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          <AmountHistogram bins={bins} />
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('stats.amountsNote')}
          </Text>
        </View>
      ),
    },

    // Con più persone nel gruppo ma nessuna che abbia anticipato qualcosa nel periodo, la
    // ciambella non ha fette: è il caso `empty`, diverso dal gruppo di una persona sola.
    paid: {
      empty: paidSlices.length === 0,
      node: (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <DonutChart
            slices={topSlices(paidSlices, TOP_SLICES, colors.textMuted)}
            centerLabel={t('stats.paidCenterLabel', { period: periodTitle })}
          />
        </View>
      ),
    },

    balance: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {transfers.length === 0 ? (
            <View style={styles.rowBetween}>
              <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}>
                {t('stats.balance.evenBody')}
              </Text>
              <CompactButton
                label={t('stats.balance.history')}
                onPress={() => router.push('/settle')}
              />
            </View>
          ) : (
            transfers.map((transfer, index) => (
              <View key={`${transfer.fromMember}-${transfer.toMember}`} style={styles.rowBetween}>
                <Text style={{ flex: 1, color: colors.text, fontSize: fontSize.md }}>
                  {t('settle.transferBefore', { from: nameOf(transfer.fromMember) })}{' '}
                  <Text style={{ color: colors.expense, fontWeight: fontWeight.semibold }}>
                    {formatMoney(transfer.amountCents, symbol)}
                  </Text>{' '}
                  {t('settle.transferAfter', { to: nameOf(transfer.toMember) })}
                </Text>
                {index === transfers.length - 1 && (
                  <CompactButton label={t('home.settle')} onPress={() => router.push('/settle')} />
                )}
              </View>
            ))
          )}
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('stats.balance.historyNote')}
          </Text>
        </View>
      ),
    },

    members: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <MemberComparison
            series={overTheYear}
            members={members}
            periodLabel={t('stats.membersPeriodLabel')}
          />
        </View>
      ),
    },

    stores: {
      empty: stores.length === 0,
      node: (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <TopList totals={stores} max={TOP_SLICES} note={t('stats.storesNote')} />
        </View>
      ),
    },

    tags: {
      empty: tags.length === 0,
      node: (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <TopList totals={tags} max={TOP_SLICES} note={t('stats.tagsNote')} />
        </View>
      ),
    },

    budget: {
      node: (
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.xs }}>
          <View style={[styles.rowBetween, { paddingBottom: spacing.xs }]}>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              {formatMonthTitle(anchor)}
            </Text>
            <Pressable
              onPress={() => router.push('/budget')}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={{ color: colors.accent, fontSize: fontSize.sm }}>
                {t('stats.budgetSet')}
              </Text>
            </Pressable>
          </View>
          {budgetState.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18 }}>
              {t('stats.budgetNoneSet', { month: formatMonthTitle(anchor) })}
            </Text>
          ) : (
            <BudgetRows statuses={budgetState} categories={categories} />
          )}
        </View>
      ),
    },
  };

  const shown = visibleWidgets(layout);

  return (
    <Screen header={header}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Finché il layout non è stato riletto non si disegna niente: partendo dal default
            si vedrebbe un lampo di schermata piena a ogni apertura del tab, a chi ne ha
            tolti dieci. È una lettura puntuale da SQLite, quindi è un battito di ciglia. */}
        {ready &&
          shown.map((id, index) => {
            const spec = widgetSpec(id);
            // `parseLayout` scarta già gli id senza scheda: questa è la seconda rete.
            if (spec === undefined) return null;
            const block = content[id];
            return (
              <DashboardWidget
                key={id}
                spec={spec}
                first={index === 0}
                unmet={unmetNeeds(spec, facts)}
                empty={block.empty ?? false}
              >
                {block.node}
              </DashboardWidget>
            );
          })}

        {ready && shown.length === 0 && (
          <View style={{ paddingTop: spacing.xl }}>
            <EmptyState
              icon={<Feather name="grid" size={26} color={colors.textFaint} />}
              title={t('dashboard.emptyTitle')}
              hint={t('dashboard.emptyHint', { action: t('dashboard.title') })}
            />
          </View>
        )}

        <View style={[styles.footer, { paddingHorizontal: spacing.lg, paddingTop: spacing.xl }]}>
          <Feather name="lock" size={13} color={colors.textFaint} />
          <Text style={{ color: colors.textFaint, fontSize: fontSize.xxs }}>
            {t('stats.footer')}
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

/**
 * Filetto verticale fra due riquadri di riepilogo.
 *
 * Il filetto **orizzontale** fra un blocco e il successivo non sta più qui: se l'ordine dei
 * blocchi lo decide il layout, a disegnare la separazione dev'essere la cornice comune —
 * `DashboardWidget` — che sa quale blocco è il primo. Scritto a mano fra un widget e
 * l'altro, il primo tratto resterebbe appeso in cima appena si toglie il widget sopra.
 */
function Divider({ color }: { color: string }) {
  return <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tiles: { flexDirection: 'row', alignItems: 'stretch' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
