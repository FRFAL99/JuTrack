import { describe, expect, it } from 'vitest';
import { computeBalances, netFor, simplifyDebts } from './balance';
import { buildSplit } from '../model/store';
import type { Expense, Settlement } from '../model/types';

/** Spesa minima con quote esplicite, per non dipendere dallo store nei test di calcolo. */
function expense(
  id: string,
  amountCents: number,
  paidBy: string,
  shares: Record<string, number>,
): Expense {
  return {
    id,
    amountCents,
    currency: 'EUR',
    date: '2026-08-01',
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy,
    split: { mode: 'custom', shares },
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    deletedAt: null,
  };
}

function settlement(id: string, from: string, to: string, amountCents: number): Settlement {
  return {
    id,
    fromMember: from,
    toMember: to,
    amountCents,
    date: '2026-08-02',
    note: '',
    createdAt: '2026-08-02T10:00:00.000Z',
    deletedAt: null,
  };
}

describe('computeBalances', () => {
  it('mette in credito chi ha anticipato più della propria quota', () => {
    // Anna paga 30 €, si divide a metà: Bea le deve 15 €.
    const balances = computeBalances([expense('e1', 3000, 'anna', { anna: 1500, bea: 1500 })], []);

    expect(netFor(balances, 'anna')).toBe(1500);
    expect(netFor(balances, 'bea')).toBe(-1500);
  });

  it('somma sempre a zero: ogni credito è il debito di qualcun altro', () => {
    // È l'invariante che rende il saldo verificabile a colpo d'occhio. Se saltasse,
    // comparirebbe denaro dal nulla.
    const balances = computeBalances(
      [
        expense('e1', 3000, 'anna', { anna: 1000, bea: 1000, carlo: 1000 }),
        expense('e2', 4500, 'bea', { anna: 1500, bea: 1500, carlo: 1500 }),
        expense('e3', 999, 'carlo', { anna: 333, bea: 333, carlo: 333 }),
      ],
      [settlement('s1', 'anna', 'bea', 700)],
    );

    expect(balances.reduce((sum, b) => sum + b.netCents, 0)).toBe(0);
  });

  it('un pareggio riduce il debito di chi versa e il credito di chi incassa', () => {
    const expenses = [expense('e1', 3000, 'anna', { anna: 1500, bea: 1500 })];
    const dopo = computeBalances(expenses, [settlement('s1', 'bea', 'anna', 1500)]);

    expect(netFor(dopo, 'anna')).toBe(0);
    expect(netFor(dopo, 'bea')).toBe(0);
  });

  it('ignora spese e pareggi cancellati', () => {
    const deleted: Expense = {
      ...expense('e1', 3000, 'anna', { anna: 1500, bea: 1500 }),
      deletedAt: '2026-08-03T10:00:00.000Z',
    };
    const revoked: Settlement = { ...settlement('s1', 'bea', 'anna', 1500), deletedAt: 'x' };

    expect(computeBalances([deleted], [revoked])).toEqual([]);
  });

  it('include a zero i membri passati in elenco che non hanno ancora speso', () => {
    // Uno schermo che non nomina una delle due persone sembra rotto.
    const balances = computeBalances([], [], ['anna', 'bea']);
    expect(balances.map((b) => b.memberId).sort()).toEqual(['anna', 'bea']);
    expect(balances.every((b) => b.netCents === 0)).toBe(true);
  });

  it('non fa sparire chi ha un debito aperto ma non è più in elenco', () => {
    const balances = computeBalances(
      [expense('e1', 2000, 'anna', { anna: 1000, ex: 1000 })],
      [],
      ['anna'],
    );
    expect(netFor(balances, 'ex')).toBe(-1000);
  });

  it('tiene separati anticipo e quota di carico', () => {
    const [anna] = computeBalances([expense('e1', 3000, 'anna', { anna: 1000, bea: 2000 })], []);
    expect(anna).toMatchObject({ memberId: 'anna', paidCents: 3000, owedCents: 1000 });
  });

  it("l'ordine non dipende dall'ordine di arrivo delle spese", () => {
    // I due telefoni ricevono gli update in ordine diverso e devono mostrare la
    // stessa lista.
    const a = expense('e1', 3000, 'anna', { anna: 1500, bea: 1500 });
    const b = expense('e2', 1000, 'bea', { anna: 500, bea: 500 });

    expect(computeBalances([a, b], [])).toEqual(computeBalances([b, a], []));
  });
});

describe('simplifyDebts', () => {
  it('con due persone propone un solo pagamento', () => {
    const balances = computeBalances([expense('e1', 3000, 'anna', { anna: 1500, bea: 1500 })], []);
    expect(simplifyDebts(balances)).toEqual([
      { fromMember: 'bea', toMember: 'anna', amountCents: 1500 },
    ]);
  });

  it('evita il giro inutile: A paga C invece di A→B→C', () => {
    const balances = [
      { memberId: 'a', paidCents: 0, owedCents: 1000, settledCents: 0, netCents: -1000 },
      { memberId: 'b', paidCents: 1000, owedCents: 1000, settledCents: 0, netCents: 0 },
      { memberId: 'c', paidCents: 1000, owedCents: 0, settledCents: 0, netCents: 1000 },
    ];
    expect(simplifyDebts(balances)).toEqual([
      { fromMember: 'a', toMember: 'c', amountCents: 1000 },
    ]);
  });

  it('i pagamenti proposti azzerano esattamente i saldi', () => {
    const balances = computeBalances(
      [
        expense('e1', 6000, 'anna', { anna: 2000, bea: 2000, carlo: 2000 }),
        expense('e2', 900, 'carlo', { anna: 300, bea: 300, carlo: 300 }),
      ],
      [],
    );

    const residuo = new Map(balances.map((b) => [b.memberId, b.netCents]));
    for (const t of simplifyDebts(balances)) {
      residuo.set(t.fromMember, (residuo.get(t.fromMember) ?? 0) + t.amountCents);
      residuo.set(t.toMember, (residuo.get(t.toMember) ?? 0) - t.amountCents);
    }
    expect([...residuo.values()].every((v) => v === 0)).toBe(true);
  });

  it('non propone nulla quando i conti sono pari', () => {
    const balances = computeBalances([expense('e1', 2000, 'anna', { anna: 2000 })], []);
    expect(simplifyDebts(balances)).toEqual([]);
  });

  it('è stabile a parità di importo', () => {
    // Due debitori identici: senza un tie-break sull'id, i due telefoni potrebbero
    // proporre pagamenti diversi per la stessa situazione.
    const balances = [
      { memberId: 'zoe', paidCents: 0, owedCents: 500, settledCents: 0, netCents: -500 },
      { memberId: 'ada', paidCents: 0, owedCents: 500, settledCents: 0, netCents: -500 },
      { memberId: 'bea', paidCents: 1000, owedCents: 0, settledCents: 0, netCents: 1000 },
    ];
    expect(simplifyDebts(balances)).toEqual(simplifyDebts([...balances].reverse()));
    expect(simplifyDebts(balances)[0]?.fromMember).toBe('ada');
  });

  it('non perde centesimi con importi non divisibili', () => {
    // 10,00 € fra 3: le quote sono 334/333/333 e il saldo deve restare intero.
    const split = buildSplit('equal', 1000, ['anna', 'bea', 'carlo']);
    const balances = computeBalances([expense('e1', 1000, 'anna', split.shares)], []);
    const transfers = simplifyDebts(balances);

    expect(transfers.reduce((sum, t) => sum + t.amountCents, 0)).toBe(666);
    expect(transfers.every((t) => Number.isInteger(t.amountCents))).toBe(true);
  });
});
