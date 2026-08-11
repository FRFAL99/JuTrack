/**
 * La griglia dei giorni: una cella per giorno, tanto più accesa quanto si è speso.
 *
 * Serve a vedere la **densità** nel tempo — le settimane fitte e i giorni vuoti — che né
 * una curva né un totale mensile mostrano.
 */
import type { Cents } from '../model/money';
import type { Expense, IsoDate } from '../model/types';
import { totalsByDay, type DayTotal } from './series';
import type { ExpenseQuery } from './query';

/** Quanti gradini oltre lo zero. Cinque livelli in tutto, 0 compreso. */
export const HEATMAP_LEVELS = 4;

export interface HeatmapCell {
  date: IsoDate;
  totalCents: Cents;
  count: number;
  /** 0 = nessuna spesa, 1..4 = quantile crescente fra i giorni in cui si è speso. */
  level: number;
}

/**
 * Le celle del periodo, giorni vuoti compresi.
 *
 * **I livelli sono per quantili, non lineari**, ed è la scelta che decide se la griglia
 * dice qualcosa. Con una scala lineare basta una singola spesa grossa — un affitto, un
 * volo — ad alzare il massimo e schiacciare tutti gli altri giorni al livello più basso: si
 * otterrebbe una griglia quasi spenta con una cella accesa, cioè precisamente
 * l'informazione che la heatmap dovrebbe dare e invece nasconde.
 *
 * I quantili si calcolano **sui soli giorni con spese**: includere i giorni vuoti li
 * sposterebbe tutti verso il basso e, in un mese tranquillo, il livello 1 finirebbe per
 * coprire quasi tutto.
 */
export function dailyHeatmap(
  expenses: Expense[],
  from: IsoDate,
  to: IsoDate,
  query: ExpenseQuery = {},
): HeatmapCell[] {
  const days = totalsByDay(expenses, query, { from, to });
  const thresholds = quantileThresholds(days);

  return days.map((day) => ({
    date: day.date,
    totalCents: day.totalCents,
    count: day.count,
    level: levelOf(day.totalCents, thresholds),
  }));
}

/**
 * I tre confini che dividono i giorni spesi in quattro gruppi di ampiezza simile.
 *
 * Tre e non quattro: il quarto gruppo è «tutto ciò che sta sopra l'ultimo confine».
 */
function quantileThresholds(days: DayTotal[]): Cents[] {
  const spent = days
    .map((day) => day.totalCents)
    .filter((total) => total > 0)
    .sort((a, b) => a - b);

  if (spent.length === 0) return [];

  return [1, 2, 3].map((k) => {
    const index = Math.floor((spent.length * k) / HEATMAP_LEVELS);
    return spent[Math.min(index, spent.length - 1)] as Cents;
  });
}

/**
 * Il livello di un giorno: quanti confini supera.
 *
 * Il confronto è `>=` sul confine, così due giorni con lo stesso importo prendono sempre lo
 * stesso livello — con `>` uno dei due potrebbe finire sotto a seconda di dove cade
 * l'indice del quantile, e due celle identiche di colore diverso sono un difetto visibile.
 */
function levelOf(totalCents: Cents, thresholds: Cents[]): number {
  if (totalCents <= 0) return 0;
  let level = 1;
  for (const threshold of thresholds) {
    if (totalCents >= threshold) level++;
  }
  return Math.min(level, HEATMAP_LEVELS);
}
