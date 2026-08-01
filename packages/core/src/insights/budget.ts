/**
 * Quanto resta di un budget.
 *
 * Un budget è un limite di spesa per una categoria in un mese. Qui si confronta con
 * quanto è stato speso davvero, e se ne ricava lo stato da mostrare.
 */
import type { Cents } from '../model/money';
import type { Budget, Expense, IsoMonth } from '../model/types';
import { monthOf } from './period';

/**
 * `near` scatta all'80% del limite.
 *
 * Avvisare al 95% sarebbe inutile — a quel punto il mese è deciso — e al 50% diventerebbe
 * rumore che si impara a ignorare.
 */
export const BUDGET_NEAR_THRESHOLD = 0.8;

export type BudgetState = 'under' | 'near' | 'over';

export interface BudgetStatus {
  categoryId: string;
  month: IsoMonth;
  limitCents: Cents;
  spentCents: Cents;
  /** Negativo se il limite è stato superato. */
  remainingCents: Cents;
  /** Speso sul limite. Vale 0 con un limite a zero, per non produrre infinito. */
  ratio: number;
  state: BudgetState;
}

/**
 * Stato di ogni budget definito per il mese, dal più critico al meno.
 *
 * L'ordine mette in cima ciò che richiede attenzione: chi apre la schermata vuole sapere
 * subito cosa sta sforando, non scorrere le categorie tranquille.
 */
export function budgetStatuses(
  budgets: Budget[],
  expenses: Expense[],
  month: IsoMonth,
): BudgetStatus[] {
  const spent = new Map<string, Cents>();
  for (const expense of expenses) {
    if (expense.deletedAt !== null) continue;
    if (expense.categoryId === null) continue;
    if (monthOf(expense.date) !== month) continue;
    spent.set(expense.categoryId, (spent.get(expense.categoryId) ?? 0) + expense.amountCents);
  }

  return budgets
    .filter((budget) => budget.month === month)
    .map((budget) => {
      const spentCents = spent.get(budget.categoryId) ?? 0;
      const ratio = budget.limitCents === 0 ? 0 : spentCents / budget.limitCents;
      return {
        categoryId: budget.categoryId,
        month: budget.month,
        limitCents: budget.limitCents,
        spentCents,
        remainingCents: budget.limitCents - spentCents,
        ratio,
        state: stateOf(spentCents, budget.limitCents),
      };
    })
    .sort((a, b) => b.ratio - a.ratio || (a.categoryId < b.categoryId ? -1 : 1));
}

/**
 * Stato di un singolo limite.
 *
 * Un limite a zero e nulla speso non è «sforato»: è un budget che non è stato ancora
 * impostato, e segnalarlo in rosso sarebbe un falso allarme.
 */
export function stateOf(spentCents: Cents, limitCents: Cents): BudgetState {
  if (limitCents <= 0) return spentCents > 0 ? 'over' : 'under';
  if (spentCents > limitCents) return 'over';
  return spentCents / limitCents >= BUDGET_NEAR_THRESHOLD ? 'near' : 'under';
}
