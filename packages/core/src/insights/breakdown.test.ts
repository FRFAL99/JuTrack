import { describe, expect, it } from 'vitest';
import { averagePerMonth, totalCents, totalsByCategory, totalsByMonth } from './breakdown';
import type { Expense } from '../model/types';

function expense(
  id: string,
  amountCents: number,
  date: string,
  categoryId: string | null,
): Expense {
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

const expenses = [
  expense('e1', 3000, '2026-06-10', 'spesa'),
  expense('e2', 1200, '2026-06-20', 'casa'),
  expense('e3', 800, '2026-08-05', 'spesa'),
  expense('e4', 500, '2026-08-06', null),
];

describe('totalCents', () => {
  it('somma le spese vive e ignora le cancellate', () => {
    const deleted: Expense = { ...expense('e9', 9999, '2026-08-07', 'casa'), deletedAt: 'ieri' };
    expect(totalCents([...expenses, deleted])).toBe(5500);
  });
});

describe('totalsByCategory', () => {
  it('ordina dal più speso al meno', () => {
    expect(totalsByCategory(expenses).map((t) => t.categoryId)).toEqual(['spesa', 'casa', null]);
  });

  it('somma per categoria e conta le spese', () => {
    const spesa = totalsByCategory(expenses).find((t) => t.categoryId === 'spesa');
    expect(spesa).toMatchObject({ totalCents: 3800, count: 2 });
  });

  it('le quote sommano a 1', () => {
    const sum = totalsByCategory(expenses).reduce((acc, t) => acc + t.share, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('raccoglie le spese senza categoria sotto null', () => {
    const senza = totalsByCategory(expenses).find((t) => t.categoryId === null);
    expect(senza?.totalCents).toBe(500);
  });

  it('mette «senza categoria» in fondo a parità di importo', () => {
    // È un contenitore di avanzi, non una voce di spesa: in cima direbbe qualcosa
    // che non è vero.
    const pari = [expense('a', 1000, '2026-08-01', 'casa'), expense('b', 1000, '2026-08-02', null)];
    expect(totalsByCategory(pari).map((t) => t.categoryId)).toEqual(['casa', null]);
  });

  it('non divide per zero quando non è stato speso nulla', () => {
    const zero = [expense('a', 0, '2026-08-01', 'casa')];
    expect(totalsByCategory(zero)[0]?.share).toBe(0);
  });

  it('restituisce vuoto senza spese', () => {
    expect(totalsByCategory([])).toEqual([]);
  });
});

describe('totalsByMonth', () => {
  it('include i mesi senza spese, a zero', () => {
    // Ometterli comprimerebbe l'asse del tempo: luglio sparirebbe e l'andamento
    // sembrerebbe più regolare di quanto è stato.
    expect(totalsByMonth(expenses)).toEqual([
      { month: '2026-06', totalCents: 4200, count: 2 },
      { month: '2026-07', totalCents: 0, count: 0 },
      { month: '2026-08', totalCents: 1300, count: 2 },
    ]);
  });

  it('rispetta un intervallo esplicito più ampio dei dati', () => {
    const months = totalsByMonth(expenses, { from: '2026-05', to: '2026-09' });
    expect(months.map((m) => m.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(months[0]?.totalCents).toBe(0);
  });

  it('è in ordine cronologico anche se le spese arrivano mescolate', () => {
    const shuffled = [...expenses].reverse();
    expect(totalsByMonth(shuffled)).toEqual(totalsByMonth(expenses));
  });

  it('restituisce vuoto senza spese e senza intervallo', () => {
    expect(totalsByMonth([])).toEqual([]);
  });
});

describe('averagePerMonth', () => {
  it('divide sul numero di mesi osservati, vuoti inclusi', () => {
    expect(averagePerMonth(totalsByMonth(expenses))).toBe(1833);
  });

  it('resta un intero di centesimi', () => {
    const media = averagePerMonth([
      { month: '2026-01', totalCents: 1000, count: 1 },
      { month: '2026-02', totalCents: 1001, count: 1 },
    ]);
    expect(Number.isInteger(media)).toBe(true);
  });

  it('vale zero senza mesi', () => {
    expect(averagePerMonth([])).toBe(0);
  });
});
