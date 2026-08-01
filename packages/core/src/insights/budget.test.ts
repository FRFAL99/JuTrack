import { describe, expect, it } from 'vitest';
import { BUDGET_NEAR_THRESHOLD, budgetStatuses, stateOf } from './budget';
import type { Budget, Expense } from '../model/types';

function expense(id: string, amountCents: number, date: string, categoryId: string | null): Expense {
  return {
    id,
    amountCents,
    currency: 'EUR',
    date,
    categoryId,
    note: '',
    paidBy: 'anna',
    split: { mode: 'single', shares: { anna: amountCents } },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
  };
}

const budgets: Budget[] = [
  { categoryId: 'spesa', month: '2026-08', limitCents: 40000 },
  { categoryId: 'casa', month: '2026-08', limitCents: 10000 },
  { categoryId: 'spesa', month: '2026-07', limitCents: 30000 },
];

describe('stateOf', () => {
  it('sotto la soglia è tranquillo', () => {
    expect(stateOf(1000, 10000)).toBe('under');
  });

  it("all'80% avvisa", () => {
    expect(stateOf(8000, 10000)).toBe('near');
    expect(BUDGET_NEAR_THRESHOLD).toBe(0.8);
  });

  it('esattamente al limite non è ancora sforato', () => {
    expect(stateOf(10000, 10000)).toBe('near');
    expect(stateOf(10001, 10000)).toBe('over');
  });

  it('un limite a zero senza spese non è un allarme', () => {
    // È un budget non ancora impostato: il rosso sarebbe un falso allarme.
    expect(stateOf(0, 0)).toBe('under');
    expect(stateOf(1, 0)).toBe('over');
  });
});

describe('budgetStatuses', () => {
  const expenses = [
    expense('e1', 35000, '2026-08-03', 'spesa'),
    expense('e2', 2000, '2026-08-04', 'casa'),
    expense('e3', 99999, '2026-07-30', 'spesa'),
    expense('e4', 5000, '2026-08-05', null),
  ];

  it('considera solo il mese richiesto', () => {
    // La spesa monstre di luglio non deve inquinare agosto.
    const spesa = budgetStatuses(budgets, expenses, '2026-08').find(
      (s) => s.categoryId === 'spesa',
    );
    expect(spesa).toMatchObject({ spentCents: 35000, remainingCents: 5000, state: 'near' });
  });

  it('elenca solo i budget di quel mese', () => {
    expect(budgetStatuses(budgets, expenses, '2026-08')).toHaveLength(2);
    expect(budgetStatuses(budgets, expenses, '2026-07')).toHaveLength(1);
  });

  it('mette in cima il budget più critico', () => {
    expect(budgetStatuses(budgets, expenses, '2026-08')[0]?.categoryId).toBe('spesa');
  });

  it('segna in negativo il residuo di un limite superato', () => {
    const sforato = budgetStatuses(
      [{ categoryId: 'casa', month: '2026-08', limitCents: 1000 }],
      expenses,
      '2026-08',
    )[0];
    expect(sforato).toMatchObject({ remainingCents: -1000, state: 'over' });
  });

  it('ignora le spese senza categoria', () => {
    // Non appartengono a nessun limite: attribuirle a uno qualsiasi falserebbe il conto.
    const totale = budgetStatuses(budgets, expenses, '2026-08').reduce(
      (sum, s) => sum + s.spentCents,
      0,
    );
    expect(totale).toBe(37000);
  });

  it('ignora le spese cancellate', () => {
    const deleted: Expense = { ...expense('e9', 4000, '2026-08-06', 'casa'), deletedAt: 'ieri' };
    const casa = budgetStatuses(budgets, [...expenses, deleted], '2026-08').find(
      (s) => s.categoryId === 'casa',
    );
    expect(casa?.spentCents).toBe(2000);
  });

  it('mostra a zero un budget su cui non si è ancora speso', () => {
    const stato = budgetStatuses(budgets, [], '2026-08');
    expect(stato.every((s) => s.spentCents === 0 && s.state === 'under')).toBe(true);
  });
});
