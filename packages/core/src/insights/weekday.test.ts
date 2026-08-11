import { describe, expect, it } from 'vitest';
import { totalsByWeekday } from './weekday';
import type { Expense } from '../model/types';

function expense(id: string, date: string, amountCents: number): Expense {
  return {
    id,
    amountCents,
    currency: 'EUR',
    date,
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy: 'anna',
    split: { mode: 'single', shares: { anna: amountCents } },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
  };
}

describe('totalsByWeekday', () => {
  it('restituisce sempre sette voci, anche senza spese', () => {
    // Togliere le barre vuote farebbe scivolare le altre e cambierebbe la forma del
    // grafico da un mese all'altro: è esattamente ciò che si vuole confrontare.
    const week = totalsByWeekday([]);
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(week.every((d) => d.totalCents === 0)).toBe(true);
  });

  it('mette il lunedì per primo', () => {
    // Il 10 agosto 2026 è un lunedì, il 16 la domenica della stessa settimana.
    const week = totalsByWeekday([
      expense('a', '2026-08-10', 1000),
      expense('b', '2026-08-16', 2000),
    ]);
    expect(week[0]?.totalCents).toBe(1000);
    expect(week[6]?.totalCents).toBe(2000);
  });

  it('somma i giorni uguali di settimane diverse', () => {
    const week = totalsByWeekday([
      expense('a', '2026-08-10', 1000),
      expense('b', '2026-08-17', 3000),
    ]);
    expect(week[0]).toMatchObject({ totalCents: 4000, count: 2, averageCents: 2000 });
  });

  it('una spesa cancellata non entra in nessuna barra', () => {
    const deleted: Expense = {
      ...expense('x', '2026-08-10', 9999),
      deletedAt: '2026-08-11T10:00:00.000Z',
    };
    expect(totalsByWeekday([deleted])[0]?.totalCents).toBe(0);
  });

  it('la media di un giorno mai speso è zero e non NaN', () => {
    expect(totalsByWeekday([]).every((d) => d.averageCents === 0)).toBe(true);
  });

  it('usa la quota quando la query filtra per persona', () => {
    const shared: Expense = {
      ...expense('s', '2026-08-10', 4000),
      split: { mode: 'equal', shares: { anna: 2000, bruno: 2000 } },
    };
    expect(totalsByWeekday([shared], { memberId: 'bruno' })[0]?.totalCents).toBe(2000);
  });
});
