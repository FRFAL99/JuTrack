import { describe, expect, it } from 'vitest';
import { dailyHeatmap } from './heatmap';
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

describe('dailyHeatmap', () => {
  it('produce una cella per giorno del periodo, vuoti compresi', () => {
    const cells = dailyHeatmap([expense('a', '2026-08-02', 1000)], '2026-08-01', '2026-08-03');
    expect(cells.map((c) => c.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
    expect(cells[0]?.level).toBe(0);
    expect(cells[1]?.level).toBeGreaterThan(0);
  });

  it('una spesa enorme non manda tutti gli altri giorni a livello zero', () => {
    // Con una scala lineare l'affitto schiaccerebbe gli altri tre giorni al minimo, e la
    // griglia direbbe «non ho speso niente» proprio nei giorni in cui ho speso.
    const cells = dailyHeatmap(
      [
        expense('a', '2026-08-01', 100),
        expense('b', '2026-08-02', 200),
        expense('c', '2026-08-03', 300),
        expense('d', '2026-08-04', 1_000_000),
      ],
      '2026-08-01',
      '2026-08-04',
    );
    expect(cells.map((c) => c.level)).toEqual([1, 2, 3, 4]);
  });

  it('i giorni senza spese restano a zero e non entrano nei quantili', () => {
    // Includere i vuoti sposterebbe i confini verso il basso, e in un mese tranquillo il
    // livello 1 finirebbe per coprire quasi tutto.
    const cells = dailyHeatmap(
      [expense('a', '2026-08-01', 100), expense('b', '2026-08-10', 5000)],
      '2026-08-01',
      '2026-08-10',
    );
    const empty = cells.filter((c) => c.totalCents === 0);
    expect(empty).toHaveLength(8);
    expect(empty.every((c) => c.level === 0)).toBe(true);
    expect(cells[0]?.level).toBeLessThan(cells[9]?.level as number);
  });

  it('due giorni con lo stesso importo prendono lo stesso livello', () => {
    const cells = dailyHeatmap(
      [
        expense('a', '2026-08-01', 500),
        expense('b', '2026-08-02', 500),
        expense('c', '2026-08-03', 900),
      ],
      '2026-08-01',
      '2026-08-03',
    );
    expect(cells[0]?.level).toBe(cells[1]?.level);
  });

  it('non supera mai il livello massimo', () => {
    const cells = dailyHeatmap(
      [expense('a', '2026-08-01', 100), expense('b', '2026-08-02', 100_000)],
      '2026-08-01',
      '2026-08-02',
    );
    expect(cells.every((c) => c.level <= 4)).toBe(true);
  });

  it('un periodo senza spese dà tutte celle a zero, non NaN', () => {
    const cells = dailyHeatmap([], '2026-08-01', '2026-08-03');
    expect(cells).toHaveLength(3);
    expect(cells.every((c) => c.level === 0 && c.totalCents === 0)).toBe(true);
  });

  it('una spesa cancellata non accende nessuna cella', () => {
    const deleted: Expense = {
      ...expense('x', '2026-08-01', 9999),
      deletedAt: '2026-08-02T10:00:00.000Z',
    };
    expect(dailyHeatmap([deleted], '2026-08-01', '2026-08-01')[0]?.level).toBe(0);
  });
});
