import { describe, expect, it } from 'vitest';
import type { Expense } from '@jutrack/core';
import { yourShareCents } from './share';

const IO = 'membro-io';
const ALTRO = 'membro-altro';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'spesa-1',
    amountCents: 5000,
    currency: 'EUR',
    date: '2026-08-01',
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy: IO,
    split: { mode: 'equal', shares: { [IO]: 2500, [ALTRO]: 2500 } },
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('yourShareCents', () => {
  it('mette in credito chi ha pagato, per la parte non sua', () => {
    // 50,00 € pagati da me e divisi a metà: 25,00 € me li deve l'altro.
    expect(yourShareCents(expense(), IO)).toBe(2500);
  });

  it('mette in debito chi non ha pagato, per la propria quota', () => {
    expect(yourShareCents(expense(), ALTRO)).toBe(-2500);
  });

  it('vale zero quando ho pagato esattamente la mia parte', () => {
    // Tutto mio e pagato da me: non sposta nulla fra me e gli altri, e mostrare
    // «+0,00 per te» su una riga così sarebbe rumore.
    const mine = expense({ split: { mode: 'single', shares: { [IO]: 5000 } } });
    expect(yourShareCents(mine, IO)).toBe(0);
  });

  it('mette in credito l intero importo di una spesa che non mi riguarda ma ho pagato', () => {
    const forOther = expense({ split: { mode: 'single', shares: { [ALTRO]: 5000 } } });
    expect(yourShareCents(forOther, IO)).toBe(5000);
  });

  it('vale zero per chi non compare nello split e non ha pagato', () => {
    expect(yourShareCents(expense(), 'membro-terzo')).toBe(0);
  });

  it('regge le quote libere, non solo la metà esatta', () => {
    const custom = expense({
      amountCents: 9000,
      paidBy: ALTRO,
      split: { mode: 'custom', shares: { [IO]: 2000, [ALTRO]: 7000 } },
    });
    expect(yourShareCents(custom, IO)).toBe(-2000);
    expect(yourShareCents(custom, ALTRO)).toBe(2000);
  });

  it('somma a zero fra tutti i membri', () => {
    // È l'invariante che rende la riga confrontabile col saldo: se le quote di una spesa
    // non si annullassero, la somma delle righe non tornerebbe mai col totale di
    // `computeBalances`.
    const custom = expense({
      amountCents: 9000,
      split: { mode: 'custom', shares: { [IO]: 2000, [ALTRO]: 7000 } },
    });
    expect(yourShareCents(custom, IO) + yourShareCents(custom, ALTRO)).toBe(0);
  });

  it('ignora una spesa cancellata', () => {
    // Il tombstone resta nel documento: contarlo mostrerebbe una quota che nessun saldo
    // conta più.
    const deleted = expense({ deletedAt: '2026-08-02T10:00:00.000Z' });
    expect(yourShareCents(deleted, IO)).toBe(0);
  });
});
