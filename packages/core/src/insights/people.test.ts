import { describe, expect, it } from 'vitest';
import { totalsByMemberOverTime } from './people';
import type { Expense } from '../model/types';

const ANNA = 'anna';
const BRUNO = 'bruno';
const MONTHS = ['2026-07', '2026-08'];

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    amountCents: 4000,
    currency: 'EUR',
    date: '2026-08-10',
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy: ANNA,
    split: { mode: 'equal', shares: { [ANNA]: 2000, [BRUNO]: 2000 } },
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('totalsByMemberOverTime', () => {
  it('tiene separati chi ha anticipato e chi ci ha rimesso', () => {
    // Anna paga 40 €, si divide a metà: ha anticipato 40 e le è costata 20. Mostrare una
    // sola delle due grandezze direbbe una cosa per l'altra.
    const series = totalsByMemberOverTime([expense()], [ANNA, BRUNO], MONTHS);
    expect(series[0]).toMatchObject({ memberId: ANNA, paidCents: 4000, owedCents: 2000 });
    expect(series[1]).toMatchObject({ memberId: BRUNO, paidCents: 0, owedCents: 2000 });
  });

  it('dà a tutti gli stessi mesi, nello stesso ordine', () => {
    // Serie con mesi diversi si disegnerebbero disallineate, ed è il confronto a saltare.
    const series = totalsByMemberOverTime([expense()], [ANNA, BRUNO], MONTHS);
    expect(series.every((s) => s.months.map((m) => m.month).join() === MONTHS.join())).toBe(true);
  });

  it('un mese senza spese resta a zero invece di sparire', () => {
    const series = totalsByMemberOverTime([expense()], [ANNA], MONTHS);
    expect(series[0]?.months[0]).toEqual({ month: '2026-07', paidCents: 0, owedCents: 0 });
  });

  it('ignora le spese fuori dai mesi richiesti', () => {
    const old = expense({ id: 'v', date: '2025-01-01' });
    const series = totalsByMemberOverTime([old], [ANNA], MONTHS);
    expect(series[0]?.paidCents).toBe(0);
  });

  it('include chi ha speso pur non essendo in elenco, in coda', () => {
    // Come `computeBalances`: un membro rimosso che ha speso non deve svanire dal grafico.
    const series = totalsByMemberOverTime([expense()], [ANNA], MONTHS);
    expect(series.map((s) => s.memberId)).toEqual([ANNA, BRUNO]);
  });

  it('rispetta l ordine di memberIds e non quello alfabetico', () => {
    const series = totalsByMemberOverTime([expense()], [BRUNO, ANNA], MONTHS);
    expect(series.map((s) => s.memberId)).toEqual([BRUNO, ANNA]);
  });

  it('una spesa cancellata non entra in nessuna serie', () => {
    const deleted = expense({ deletedAt: '2026-08-11T10:00:00.000Z' });
    const series = totalsByMemberOverTime([deleted], [ANNA, BRUNO], MONTHS);
    expect(series.every((s) => s.paidCents === 0 && s.owedCents === 0)).toBe(true);
  });

  it('senza spese dà comunque una serie per membro, tutta a zero', () => {
    const series = totalsByMemberOverTime([], [ANNA, BRUNO], MONTHS);
    expect(series).toHaveLength(2);
    expect(series[0]?.months).toHaveLength(2);
    expect(series[0]?.owedCents).toBe(0);
  });

  it('senza mesi non solleva', () => {
    expect(totalsByMemberOverTime([expense()], [ANNA], [])).toEqual([
      { memberId: ANNA, months: [], paidCents: 0, owedCents: 0 },
    ]);
  });
});
