/**
 * Quanto si spende in ciascun giorno della settimana.
 *
 * È la forma che fa vedere un'**abitudine** invece di un totale: il sabato della spesa
 * grossa, il venerdì della pizza. Serve a poco su due settimane di dati, e diventa
 * leggibile su qualche mese.
 */
import type { Cents } from '../model/money';
import type { Expense } from '../model/types';
import { dayOfWeek } from './calendar';
import { amountFor, type ExpenseQuery } from './query';

export interface WeekdayTotal {
  /** 0 = lunedì, 6 = domenica. */
  weekday: number;
  totalCents: Cents;
  count: number;
  /** Media per volta che quel giorno compare fra le spese. Zero se non compare mai. */
  averageCents: Cents;
}

/**
 * Sette voci, **sempre tutte e sette**, da lunedì a domenica.
 *
 * Un giorno senza spese vale zero e resta in elenco: togliere le barre vuote farebbe
 * scivolare le altre e cambierebbe la forma del grafico da un mese all'altro, che è
 * esattamente ciò che si sta cercando di confrontare.
 */
export function totalsByWeekday(expenses: Expense[], query: ExpenseQuery = {}): WeekdayTotal[] {
  const totals = Array.from({ length: 7 }, () => ({ totalCents: 0, count: 0 }));

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    const slot = totals[dayOfWeek(expense.date)];
    if (slot === undefined) continue;
    slot.totalCents += amountFor(expense, query);
    slot.count++;
  }

  return totals.map((slot, weekday) => ({
    weekday,
    totalCents: slot.totalCents,
    count: slot.count,
    averageCents: slot.count === 0 ? 0 : Math.round(slot.totalCents / slot.count),
  }));
}
