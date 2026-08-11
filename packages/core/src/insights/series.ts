/**
 * L'andamento nel tempo, giorno per giorno.
 *
 * Le spese arrivano **già filtrate** da `applyQuery`, e insieme alla query che le ha
 * selezionate: l'importo di ciascuna è `amountFor`, non `amountCents`. È la regola che
 * tiene d'accordo il totale in testa alla schermata con le curve sotto.
 */
import type { Cents } from '../model/money';
import type { Expense, IsoDate } from '../model/types';
import { daysBetween } from './calendar';
import { amountFor, type ExpenseQuery } from './query';

export interface DayTotal {
  date: IsoDate;
  totalCents: Cents;
  count: number;
}

/**
 * Totali giorno per giorno, in ordine cronologico.
 *
 * **I giorni senza spese compaiono a zero**, come i mesi vuoti di `totalsByMonth`:
 * ometterli comprimerebbe l'asse del tempo, e due punti affiancati sembrerebbero giorni
 * consecutivi anche a distanza di una settimana. Senza `from`/`to` l'intervallo è quello
 * osservato nelle spese.
 */
export function totalsByDay(
  expenses: Expense[],
  query: ExpenseQuery = {},
  options: { from?: IsoDate; to?: IsoDate } = {},
): DayTotal[] {
  const totals = new Map<IsoDate, { totalCents: Cents; count: number }>();

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    const current = totals.get(expense.date) ?? { totalCents: 0, count: 0 };
    current.totalCents += amountFor(expense, query);
    current.count++;
    totals.set(expense.date, current);
  }

  const observed = [...totals.keys()].sort();
  const first = options.from ?? query.from ?? observed[0];
  const last = options.to ?? query.to ?? observed[observed.length - 1];
  if (first === undefined || last === undefined) return [];

  return daysBetween(first, last).map((date) => ({
    date,
    totalCents: totals.get(date)?.totalCents ?? 0,
    count: totals.get(date)?.count ?? 0,
  }));
}

/**
 * La stessa serie, sommata da sinistra: quanto si è speso **dall'inizio del periodo**.
 *
 * È la forma che risponde a «a metà mese ero già oltre?», che una serie di picchi
 * giornalieri non sa dire. Prende l'uscita di `totalsByDay` invece delle spese, così
 * l'intervallo e i giorni vuoti sono già stati decisi una volta sola.
 */
export function cumulativeByDay(days: DayTotal[]): DayTotal[] {
  let running = 0;
  let counted = 0;
  return days.map((day) => {
    running += day.totalCents;
    counted += day.count;
    return { date: day.date, totalCents: running, count: counted };
  });
}

/**
 * Media mobile su una finestra di giorni, per leggere l'andamento sotto il rumore.
 *
 * Lavora su numeri e non su `DayTotal`: il risultato non è un totale di niente, è una
 * media, e chiamarla `totalCents` sarebbe una bugia sul tipo. La finestra è **all'indietro**
 * — ogni punto è la media dei `window` giorni fino a quel giorno compreso — perché una
 * finestra centrata userebbe giorni futuri, che su un mese in corso non esistono.
 *
 * I primi giorni si mediano su quanti ce ne sono: partire da zero disegnerebbe una salita
 * che nei dati non c'è.
 */
export function movingAverage(values: number[], window: number): number[] {
  if (window < 1) return [...values];
  const out: number[] = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i] as number;
    if (i >= window) sum -= values[i - window] as number;
    const size = Math.min(i + 1, window);
    // Arrotondata a un intero: restare in centesimi interi è la regola del progetto.
    out.push(Math.round(sum / size));
  }

  return out;
}

/** Media giornaliera sul periodo osservato, giorni vuoti inclusi. */
export function averagePerDay(days: DayTotal[]): Cents {
  if (days.length === 0) return 0;
  const sum = days.reduce((acc, day) => acc + day.totalCents, 0);
  return Math.round(sum / days.length);
}
