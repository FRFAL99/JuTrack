import { describe, expect, it } from 'vitest';
import { averagePerDay, cumulativeByDay, movingAverage, totalsByDay } from './series';
import type { Expense } from '../model/types';

const ANNA = 'anna';
const BRUNO = 'bruno';

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
    paidBy: ANNA,
    split: {
      mode: 'equal',
      shares: { [ANNA]: Math.ceil(amountCents / 2), [BRUNO]: Math.floor(amountCents / 2) },
    },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
    deletedAt: null,
  };
}

const expenses = [
  expense('a', '2026-08-01', 1000),
  expense('b', '2026-08-01', 500),
  expense('c', '2026-08-04', 2000),
];

describe('totalsByDay', () => {
  it('include i giorni senza spese, a zero', () => {
    // Ometterli comprimerebbe l'asse del tempo: il 2 e il 3 sparirebbero e l'andamento
    // sembrerebbe più regolare di quanto è stato.
    expect(totalsByDay(expenses)).toEqual([
      { date: '2026-08-01', totalCents: 1500, count: 2 },
      { date: '2026-08-02', totalCents: 0, count: 0 },
      { date: '2026-08-03', totalCents: 0, count: 0 },
      { date: '2026-08-04', totalCents: 2000, count: 1 },
    ]);
  });

  it('prende l intervallo dalla query quando c è', () => {
    const days = totalsByDay(expenses, { from: '2026-07-30', to: '2026-08-05' });
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: '2026-07-30', totalCents: 0, count: 0 });
  });

  it('un intervallo esplicito vince sulla query', () => {
    const days = totalsByDay(expenses, { from: '2026-07-30' }, { from: '2026-08-01' });
    expect(days[0]?.date).toBe('2026-08-01');
  });

  it('usa la quota quando la query filtra per persona', () => {
    // 15,00 € il primo giorno, di cui 7,50 a carico di Bruno.
    const days = totalsByDay(expenses, { memberId: BRUNO });
    expect(days[0]?.totalCents).toBe(750);
  });

  it('una spesa cancellata non entra nella serie', () => {
    const deleted: Expense = {
      ...expense('x', '2026-08-02', 9999),
      deletedAt: '2026-08-03T10:00:00.000Z',
    };
    expect(totalsByDay([...expenses, deleted])[1]?.totalCents).toBe(0);
  });

  it('un periodo senza spese dà l elenco vuoto e non NaN', () => {
    expect(totalsByDay([])).toEqual([]);
  });

  it('un periodo esplicito senza spese dà giorni a zero', () => {
    const days = totalsByDay([], {}, { from: '2026-08-01', to: '2026-08-03' });
    expect(days.map((d) => d.totalCents)).toEqual([0, 0, 0]);
  });
});

describe('cumulativeByDay', () => {
  it('somma da sinistra e finisce sul totale', () => {
    const days = cumulativeByDay(totalsByDay(expenses));
    expect(days.map((d) => d.totalCents)).toEqual([1500, 1500, 1500, 3500]);
    expect(days[days.length - 1]?.count).toBe(3);
  });

  it('non modifica la serie che riceve', () => {
    const days = totalsByDay(expenses);
    cumulativeByDay(days);
    expect(days[3]?.totalCents).toBe(2000);
  });

  it('regge una serie vuota', () => {
    expect(cumulativeByDay([])).toEqual([]);
  });
});

describe('movingAverage', () => {
  it('media sui giorni disponibili, non su zeri inventati', () => {
    // Partire da zero disegnerebbe una salita che nei dati non c'è.
    expect(movingAverage([300, 900], 3)).toEqual([300, 600]);
  });

  it('scorre la finestra all indietro', () => {
    expect(movingAverage([0, 300, 600, 900], 2)).toEqual([0, 150, 450, 750]);
  });

  it('resta su interi di centesimi', () => {
    expect(movingAverage([100, 101], 2).every(Number.isInteger)).toBe(true);
  });

  it('con finestra 1 restituisce la serie stessa', () => {
    expect(movingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });

  it('con una finestra assurda non divide per zero', () => {
    expect(movingAverage([1, 2], 0)).toEqual([1, 2]);
  });

  it('regge la serie vuota', () => {
    expect(movingAverage([], 7)).toEqual([]);
  });
});

describe('averagePerDay', () => {
  it('divide sui giorni osservati, vuoti inclusi', () => {
    expect(averagePerDay(totalsByDay(expenses))).toBe(875);
  });

  it('vale zero senza giorni', () => {
    expect(averagePerDay([])).toBe(0);
  });
});
