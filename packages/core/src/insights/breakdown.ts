/**
 * Dove sono finiti i soldi: per categoria e nel tempo.
 *
 * Aggregazioni pure sulle spese già filtrate da chi chiama. Restano qui e non nella UI
 * perché sono la parte che vale la pena verificare: un totale sbagliato non si nota
 * guardando un grafico, si nota a fine mese.
 */
import type { Cents } from '../model/money';
import type { Expense, IsoMonth } from '../model/types';
import { monthOf, monthsBetween } from './period';
import { amountFor, type ExpenseQuery } from './query';

export interface CategoryTotal {
  /** `null` raccoglie le spese senza categoria. */
  categoryId: string | null;
  totalCents: Cents;
  count: number;
  /** Quota sul totale, fra 0 e 1. Vale 0 se non è stato speso nulla. */
  share: number;
}

export interface MonthTotal {
  month: IsoMonth;
  totalCents: Cents;
  count: number;
}

/**
 * Somma delle spese, escluse le cancellate.
 *
 * **Il secondo argomento è additivo** (Step 25): senza query l'importo è quello pieno,
 * esattamente come prima. Con una query che filtra per persona diventa la quota di quella
 * persona, perché altrimenti questa funzione — e le due sotto — sarebbero le uniche a
 * leggere `amountCents` per conto proprio, e il totale in testa alla schermata non
 * tornerebbe con i grafici sotto. Vedi `amountFor` in `query.ts`.
 */
export function totalCents(expenses: Expense[], query: ExpenseQuery = {}): Cents {
  return expenses.reduce((sum, e) => (e.deletedAt === null ? sum + amountFor(e, query) : sum), 0);
}

/**
 * Totali per categoria, dal più alto al più basso.
 *
 * A parità di importo decide l'id, non l'ordine di iterazione della mappa: i due telefoni
 * devono disegnare le barre nella stessa sequenza, altrimenti la stessa situazione sembra
 * due situazioni diverse.
 */
export function totalsByCategory(expenses: Expense[], query: ExpenseQuery = {}): CategoryTotal[] {
  const totals = new Map<string | null, { totalCents: Cents; count: number }>();

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    const current = totals.get(expense.categoryId) ?? { totalCents: 0, count: 0 };
    current.totalCents += amountFor(expense, query);
    current.count++;
    totals.set(expense.categoryId, current);
  }

  const overall = [...totals.values()].reduce((sum, t) => sum + t.totalCents, 0);

  return [...totals.entries()]
    .map(([categoryId, t]) => ({
      categoryId,
      totalCents: t.totalCents,
      count: t.count,
      share: overall === 0 ? 0 : t.totalCents / overall,
    }))
    .sort((a, b) => b.totalCents - a.totalCents || compareCategoryId(a.categoryId, b.categoryId));
}

/**
 * Totali mese per mese, in ordine cronologico.
 *
 * **I mesi senza spese compaiono a zero.** Ometterli comprimerebbe l'asse del tempo:
 * due barre affiancate sembrerebbero mesi consecutivi anche a distanza di un anno, e
 * l'andamento risulterebbe più regolare di quanto sia stato.
 */
export function totalsByMonth(
  expenses: Expense[],
  options: { from?: IsoMonth; to?: IsoMonth } = {},
  query: ExpenseQuery = {},
): MonthTotal[] {
  const totals = new Map<IsoMonth, { totalCents: Cents; count: number }>();

  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    const month = monthOf(expense.date);
    const current = totals.get(month) ?? { totalCents: 0, count: 0 };
    current.totalCents += amountFor(expense, query);
    current.count++;
    totals.set(month, current);
  }

  const observed = [...totals.keys()].sort();
  const first = options.from ?? observed[0];
  const last = options.to ?? observed[observed.length - 1];
  if (first === undefined || last === undefined) return [];

  return monthsBetween(first, last).map((month) => ({
    month,
    totalCents: totals.get(month)?.totalCents ?? 0,
    count: totals.get(month)?.count ?? 0,
  }));
}

/** Media mensile sul periodo osservato, mesi vuoti inclusi. */
export function averagePerMonth(months: MonthTotal[]): Cents {
  if (months.length === 0) return 0;
  const sum = months.reduce((acc, m) => acc + m.totalCents, 0);
  // Arrotondata a un intero: restare in centesimi interi è la regola del progetto, e una
  // media con la virgola si propagherebbe nei confronti come un float.
  return Math.round(sum / months.length);
}

/** `null` (senza categoria) va in fondo a parità di importo: è un contenitore, non una voce. */
function compareCategoryId(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}
