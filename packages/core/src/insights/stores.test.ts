import { describe, expect, it } from 'vitest';
import { totalsByStore, totalsByTag } from './stores';
import type { Expense } from '../model/types';

const ANNA = 'anna';
const BRUNO = 'bruno';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    amountCents: 1000,
    currency: 'EUR',
    date: '2026-08-01',
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy: ANNA,
    split: { mode: 'equal', shares: { [ANNA]: 500, [BRUNO]: 500 } },
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('totalsByStore', () => {
  it('aggrega le grafie diverse dello stesso negozio in una voce sola', () => {
    const rows = totalsByStore([
      expense({ id: 'a', store: 'Esselunga', amountCents: 1000 }),
      expense({ id: 'b', store: 'esselunga', amountCents: 2000 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Esselunga', key: 'esselunga', totalCents: 3000 });
  });

  it('ordina dal più speso al meno', () => {
    const rows = totalsByStore([
      expense({ id: 'a', store: 'Bar', amountCents: 500 }),
      expense({ id: 'b', store: 'Coop', amountCents: 4000 }),
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Coop', 'Bar']);
  });

  it('decide con la chiave a parità di importo', () => {
    const rows = [expense({ id: 'a', store: 'Zara' }), expense({ id: 'b', store: 'Coop' })];
    expect(totalsByStore(rows).map((r) => r.key)).toEqual(['coop', 'zara']);
    expect(totalsByStore([...rows].reverse()).map((r) => r.key)).toEqual(['coop', 'zara']);
  });

  it('non produce una voce «senza negozio»', () => {
    // Il campo è facoltativo: quella voce dominerebbe ogni grafico dicendo soltanto che
    // il campo è facoltativo.
    expect(totalsByStore([expense({ id: 'a' })])).toEqual([]);
  });

  it('le quote sommano a uno sul totale coperto', () => {
    const rows = totalsByStore([
      expense({ id: 'a', store: 'Coop', amountCents: 3000 }),
      expense({ id: 'b', store: 'Bar', amountCents: 1000 }),
      expense({ id: 'c' }),
    ]);
    expect(rows.reduce((sum, r) => sum + r.share, 0)).toBeCloseTo(1, 10);
    expect(rows[0]?.share).toBeCloseTo(0.75, 10);
  });

  it('una spesa cancellata non entra in nessuna voce', () => {
    const deleted = expense({ id: 'x', store: 'Coop', deletedAt: '2026-08-02T10:00:00.000Z' });
    expect(totalsByStore([deleted])).toEqual([]);
  });

  it('usa la quota quando la query filtra per persona', () => {
    const rows = totalsByStore([expense({ id: 'a', store: 'Coop' })], { memberId: BRUNO });
    expect(rows[0]?.totalCents).toBe(500);
  });

  it('senza spese non divide per zero', () => {
    expect(totalsByStore([])).toEqual([]);
  });
});

describe('totalsByTag', () => {
  it('conta una spesa per intero in ciascuno dei suoi tag', () => {
    // La somma supera il totale, ed è giusto: la domanda è «quanto ho speso in cose
    // etichettate casa», non «come si ripartisce il totale».
    const rows = totalsByTag([expense({ id: 'a', tags: ['casa', 'regalo'], amountCents: 1000 })]);
    expect(rows.map((r) => r.totalCents)).toEqual([1000, 1000]);
  });

  it('aggrega le grafie diverse dello stesso tag', () => {
    const rows = totalsByTag([
      expense({ id: 'a', tags: ['Casa'] }),
      expense({ id: 'b', tags: ['casa'] }),
      expense({ id: 'c', tags: ['casa'] }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('casa');
    expect(rows[0]?.count).toBe(3);
  });

  it('una spesa senza tag non produce voci', () => {
    expect(totalsByTag([expense({ id: 'a' })])).toEqual([]);
  });
});
