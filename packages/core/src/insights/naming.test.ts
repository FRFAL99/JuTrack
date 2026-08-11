import { describe, expect, it } from 'vitest';
import { knownStores, knownTags, normalizeStore, normalizeTags, storeKey, tagKey } from './naming';
import type { Expense } from '../model/types';

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
    paidBy: 'anna',
    split: { mode: 'single', shares: { anna: 1000 } },
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('storeKey', () => {
  it('unisce Esselunga ed esselunga', () => {
    // Senza, «top negozi» diventa un elenco di refusi: la stessa spesa fatta nello
    // stesso posto produrrebbe due barre.
    expect(storeKey('Esselunga')).toBe(storeKey('esselunga'));
  });

  it('ignora gli spazi ai margini e collassa quelli interni', () => {
    expect(storeKey('  Bar   dello  Sport ')).toBe('bar dello sport');
  });
});

describe('tagKey', () => {
  it('segue la stessa regola delle chiavi dei negozi', () => {
    expect(tagKey(' Regalo ')).toBe('regalo');
  });
});

describe('normalizeStore', () => {
  it('ripulisce gli spazi e conserva le maiuscole scritte', () => {
    expect(normalizeStore('  Bar   dello  Sport ')).toBe('Bar dello Sport');
  });

  it('lascia vuoto un negozio fatto di soli spazi', () => {
    expect(normalizeStore('   ')).toBe('');
  });
});

describe('normalizeTags', () => {
  it('deduplica sulla chiave normalizzata, non sulla grafia', () => {
    // `Spesa` e `spesa` sulla stessa riga sarebbero un doppione che poi produce due barre.
    expect(normalizeTags(['Spesa', 'spesa ', 'SPESA'])).toEqual(['Spesa']);
  });

  it('scarta i vuoti invece di salvarli', () => {
    expect(normalizeTags(['', '  ', 'regalo'])).toEqual(['regalo']);
  });

  it('conserva l ordine in cui sono stati scritti', () => {
    expect(normalizeTags(['viaggio', 'regalo', 'lavoro'])).toEqual(['viaggio', 'regalo', 'lavoro']);
  });

  it('non tocca un elenco già pulito', () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe('knownStores', () => {
  it('ordina per frequenza e restituisce la grafia più usata', () => {
    const expenses = [
      expense({ id: 'a', store: 'esselunga' }),
      expense({ id: 'b', store: 'Esselunga' }),
      expense({ id: 'c', store: 'Esselunga' }),
      expense({ id: 'd', store: 'Bar Rossi' }),
    ];
    expect(knownStores(expenses)).toEqual(['Esselunga', 'Bar Rossi']);
  });

  it('ignora le spese senza negozio', () => {
    expect(knownStores([expense(), expense({ id: 'b', store: 'Coop' })])).toEqual(['Coop']);
  });

  it('non suggerisce il negozio di una spesa cancellata', () => {
    // È sparito con lei: continuare a proporlo mostrerebbe un posto che non risulta più
    // da nessuna parte nell'app.
    const deleted = expense({ id: 'x', store: 'Sparito', deletedAt: '2026-08-02T10:00:00.000Z' });
    expect(knownStores([deleted, expense({ id: 'b', store: 'Coop' })])).toEqual(['Coop']);
  });

  it('decide con la chiave a parità di frequenza, così i due telefoni concordano', () => {
    const expenses = [expense({ id: 'a', store: 'Zara' }), expense({ id: 'b', store: 'Coop' })];
    expect(knownStores(expenses)).toEqual(['Coop', 'Zara']);
    expect(knownStores([...expenses].reverse())).toEqual(['Coop', 'Zara']);
  });

  it('restituisce vuoto senza spese', () => {
    expect(knownStores([])).toEqual([]);
  });
});

describe('knownTags', () => {
  it('conta ogni tag della spesa e ordina per frequenza', () => {
    const expenses = [
      expense({ id: 'a', tags: ['viaggio', 'regalo'] }),
      expense({ id: 'b', tags: ['viaggio'] }),
      expense({ id: 'c', tags: ['Viaggio'] }),
    ];
    // Tre usi della stessa etichetta, una voce sola, nella grafia scritta più volte.
    expect(knownTags(expenses)).toEqual(['viaggio', 'regalo']);
  });

  it('ignora i tag delle spese cancellate', () => {
    const deleted = expense({ id: 'x', tags: ['vecchio'], deletedAt: '2026-08-02T10:00:00.000Z' });
    expect(knownTags([deleted])).toEqual([]);
  });

  it('regge un tags sporco arrivato da un altro dispositivo', () => {
    // `readExpense` scarta già i non-stringa, ma qui possono arrivare stringhe vuote.
    expect(knownTags([expense({ tags: ['', '  ', 'buono'] })])).toEqual(['buono']);
  });
});
