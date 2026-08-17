import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { VaultStore, type VaultSnapshot } from '@jutrack/core';
import { encodeSnapshotAsState } from './build';

/** Sorgente deterministica: qui serve solo a costruire lo store, non a generare id. */
const random = {
  getRandomBytes: (length: number): Uint8Array => new Uint8Array(length).fill(7),
};

const snapshot: VaultSnapshot = {
  expenses: [
    {
      id: 'e1',
      amountCents: 2500,
      currency: 'EUR',
      date: '2026-07-04',
      categoryId: 'spesa',
      note: 'pane',
      store: 'Esselunga',
      tags: ['casa'],
      paidBy: 'anna',
      split: { mode: 'equal', shares: { anna: 1250, bruno: 1250 } },
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      deletedAt: null,
    },
  ],
  categories: [{ id: 'spesa', name: 'Spesa', icon: '🛒', color: '#C2255C', archived: false }],
  members: [
    { id: 'anna', name: 'Anna', color: '#3B5BDB' },
    { id: 'bruno', name: 'Bruno', color: '#2F9E44' },
  ],
  budgets: [{ categoryId: 'spesa', month: '2026-07', limitCents: 30000 }],
  settlements: [],
};

/** Rilegge lo stato come farebbe il gruppo appena creato quando lo si apre. */
function reopen(state: Uint8Array): VaultStore {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  return new VaultStore(doc, { random });
}

describe('encodeSnapshotAsState', () => {
  it('produce uno stato che, riaperto, contiene il vault intero', () => {
    const store = reopen(encodeSnapshotAsState(snapshot, random));
    expect(store.snapshot()).toEqual(snapshot);
  });

  it('conserva gli id: è ciò che tiene in piedi paidBy e le quote', () => {
    const store = reopen(encodeSnapshotAsState(snapshot, random));
    const expense = store.listExpenses()[0]!;
    expect(expense.id).toBe('e1');
    expect(store.getMember(expense.paidBy)?.name).toBe('Anna');
  });

  it('non tocca il documento di partenza: lo costruisce da zero ogni volta', () => {
    const first = encodeSnapshotAsState(snapshot, random);
    const second = encodeSnapshotAsState(snapshot, random);
    expect(reopen(first).snapshot()).toEqual(reopen(second).snapshot());
  });

  it('una fotografia vuota produce uno stato applicabile, non un errore', () => {
    const empty: VaultSnapshot = {
      expenses: [],
      categories: [],
      members: [],
      budgets: [],
      settlements: [],
    };
    expect(reopen(encodeSnapshotAsState(empty, random)).listExpenses()).toEqual([]);
  });
});
