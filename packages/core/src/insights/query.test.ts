import { describe, expect, it } from 'vitest';
import {
  amountFor,
  applyQuery,
  describeQuery,
  isEmptyQuery,
  queryParts,
  queryTotalCents,
  type ExpenseQuery,
} from './query';
import type { Expense } from '../model/types';

const ANNA = 'anna';
const BRUNO = 'bruno';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    amountCents: 4000,
    currency: 'EUR',
    date: '2026-08-10',
    categoryId: 'cibo',
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

describe('amountFor', () => {
  it('senza filtro persona restituisce l importo pieno', () => {
    expect(amountFor(expense(), {})).toBe(4000);
  });

  it('con filtro persona restituisce la quota e non l importo pieno', () => {
    // La cena da 40 € divisa a metà: filtrando su Anna sono 20 €, non 40. Mostrare 40
    // sarebbe falso, ed è il numero plausibile e sbagliato che questa funzione esiste per
    // non produrre.
    expect(amountFor(expense(), { memberId: ANNA })).toBe(2000);
  });

  it('«ha pagato» restituisce l importo pieno, non la quota', () => {
    // Sotto un filtro che dice «pagate da Anna», la cena che ha pagato lei è 40 €.
    expect(amountFor(expense(), { memberId: ANNA, personMode: 'paid' })).toBe(4000);
  });

  it('«ha pagato» vale zero per chi non ha pagato', () => {
    expect(amountFor(expense(), { memberId: BRUNO, personMode: 'paid' })).toBe(0);
  });

  it('vale zero per chi non compare fra le quote', () => {
    expect(amountFor(expense(), { memberId: 'carla' })).toBe(0);
  });
});

describe('applyQuery', () => {
  const expenses = [
    expense({ id: 'a', date: '2026-07-01', amountCents: 1000, categoryId: 'casa' }),
    expense({ id: 'b', date: '2026-08-10', store: 'Esselunga', tags: ['casa'] }),
    expense({ id: 'c', date: '2026-08-20', amountCents: 20000, categoryId: 'viaggi' }),
  ];

  const ids = (query: ExpenseQuery): string[] => applyQuery(expenses, query).map((e) => e.id);

  it('senza filtri restituisce tutto, tranne le cancellate', () => {
    const deleted = expense({ id: 'x', deletedAt: '2026-08-21T10:00:00.000Z' });
    expect(applyQuery([...expenses, deleted], {})).toHaveLength(3);
  });

  it('filtra per intervallo di date, estremi inclusi', () => {
    expect(ids({ from: '2026-08-10', to: '2026-08-20' })).toEqual(['b', 'c']);
  });

  it('filtra per categoria, in OR fra quelle indicate', () => {
    expect(ids({ categoryIds: ['casa', 'viaggi'] })).toEqual(['a', 'c']);
  });

  it('un elenco di categorie vuoto non filtra nulla', () => {
    expect(ids({ categoryIds: [] })).toHaveLength(3);
  });

  it('filtra per negozio sulla chiave, non sulla grafia', () => {
    expect(ids({ stores: ['esselunga'] })).toEqual(['b']);
  });

  it('filtra per tag in OR', () => {
    expect(ids({ tags: ['CASA', 'regalo'] })).toEqual(['b']);
  });

  it('combina i filtri in AND', () => {
    expect(ids({ from: '2026-08-01', categoryIds: ['viaggi'] })).toEqual(['c']);
    expect(ids({ from: '2026-08-01', categoryIds: ['casa'] })).toEqual([]);
  });

  it('la fascia di importo si misura sull importo proiettato', () => {
    // Senza filtro persona la spesa vale 40 € ed esce da una fascia 0–30; con il filtro
    // vale 20 € e ci rientra. Altrimenti l'istogramma mostrerebbe barre fuori fascia.
    const dinner = [expense({ id: 'd' })];
    expect(applyQuery(dinner, { maxCents: 3000 })).toHaveLength(0);
    expect(applyQuery(dinner, { maxCents: 3000, memberId: ANNA })).toHaveLength(1);
  });

  it('«a carico di» esclude chi non partecipa alla spesa', () => {
    const mine = expense({ id: 'm', split: { mode: 'single', shares: { [ANNA]: 4000 } } });
    expect(applyQuery([mine], { memberId: BRUNO })).toHaveLength(0);
    expect(applyQuery([mine], { memberId: ANNA })).toHaveLength(1);
  });

  it('«ha pagato» tiene solo le spese anticipate da quella persona', () => {
    const byBruno = expense({ id: 'p', paidBy: BRUNO });
    const both = [expense({ id: 'q' }), byBruno];
    expect(applyQuery(both, { memberId: BRUNO, personMode: 'paid' }).map((e) => e.id)).toEqual([
      'p',
    ]);
  });

  it('una quota a zero non conta come partecipazione', () => {
    const zero = expense({
      id: 'z',
      split: { mode: 'custom', shares: { [ANNA]: 4000, [BRUNO]: 0 } },
    });
    expect(applyQuery([zero], { memberId: BRUNO })).toHaveLength(0);
  });
});

describe('queryTotalCents', () => {
  it('somma gli importi proiettati', () => {
    const rows = [expense({ id: 'a' }), expense({ id: 'b', amountCents: 1000 })];
    expect(queryTotalCents(rows, {})).toBe(5000);
  });

  it('con filtro persona somma le quote', () => {
    const rows = [expense({ id: 'a' })];
    expect(queryTotalCents(rows, { memberId: ANNA })).toBe(2000);
  });

  it('un periodo senza spese dà zero e non NaN', () => {
    expect(queryTotalCents([], { from: '2026-01-01', to: '2026-01-31' })).toBe(0);
  });
});

describe('queryParts e describeQuery', () => {
  const labels = {
    period: 'Agosto',
    category: (id: string) => (id === 'cibo' ? 'Cibo' : id),
    member: (id: string) => (id === ANNA ? 'Anna' : id),
  };

  it('senza filtri non dice niente', () => {
    expect(queryParts({})).toEqual([]);
    expect(isEmptyQuery({})).toBe(true);
    expect(describeQuery({})).toBe('Tutte le spese');
  });

  it('usa l etichetta di periodo fornita da chi chiama', () => {
    expect(queryParts({ from: '2026-08-01', to: '2026-08-31' }, labels)).toEqual(['Agosto']);
  });

  it('ripiega sulle date grezze quando l etichetta manca', () => {
    expect(queryParts({ from: '2026-08-01', to: '2026-08-31' })).toEqual([
      '2026-08-01 → 2026-08-31',
    ]);
  });

  it('nomina la categoria sola e conta le altre', () => {
    expect(queryParts({ categoryIds: ['cibo'] }, labels)).toEqual(['Cibo']);
    expect(queryParts({ categoryIds: ['cibo', 'casa'] }, labels)).toEqual(['2 categorie']);
  });

  it('distingue le due modalità del filtro persona', () => {
    expect(queryParts({ memberId: ANNA }, labels)).toEqual(['A carico di Anna']);
    expect(queryParts({ memberId: ANNA, personMode: 'paid' }, labels)).toEqual(['Pagate da Anna']);
  });

  it('dice la fascia di importo in euro', () => {
    expect(queryParts({ minCents: 1000, maxCents: 5000 })).toEqual(['10,00 € – 50,00 €']);
    expect(queryParts({ minCents: 1000 })).toEqual(['Da 10,00 €']);
    expect(queryParts({ maxCents: 5000 })).toEqual(['Fino a 50,00 €']);
  });

  it('unisce le frasi col punto mediano', () => {
    const query: ExpenseQuery = { from: '2026-08-01', categoryIds: ['cibo'], memberId: ANNA };
    expect(describeQuery(query, labels)).toBe('Agosto · Cibo · A carico di Anna');
  });

  it('riconosce come attivo anche un filtro solo', () => {
    expect(isEmptyQuery({ tags: ['casa'] })).toBe(false);
    expect(isEmptyQuery({ categoryIds: [] })).toBe(true);
  });
});
