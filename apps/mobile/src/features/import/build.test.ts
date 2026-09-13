import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { parseVaultExport, toJsonExport, VaultStore, type VaultSnapshot } from '@jutrack/core';
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
  vocabulary: [],
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
      vocabulary: [],
    };
    expect(reopen(encodeSnapshotAsState(empty, random)).listExpenses()).toEqual([]);
  });
});

/**
 * La stessa fotografia, con ogni collezione in ordine stabile.
 *
 * **Il giro non conserva l'ordine, e non deve.** `snapshot()` riordina i record — le spese
 * per data e, a parità, per id — quindi due spese dello stesso giorno possono uscire in un
 * ordine e rientrare nell'altro senza che si sia perso niente. Confrontare le posizioni
 * vorrebbe dire fissare in un test un ordinamento che il modello non promette; quello che
 * va confrontato è il **contenuto**.
 */
function normalized(snap: VaultSnapshot): VaultSnapshot {
  const by = <T>(items: T[], key: (item: T) => string): T[] =>
    [...items].sort((a, b) => key(a).localeCompare(key(b)));

  return {
    expenses: by(snap.expenses, (e) => e.id),
    categories: by(snap.categories, (c) => c.id),
    members: by(snap.members, (m) => m.id),
    budgets: by(snap.budgets, (b) => `${b.categoryId}:${b.month}`),
    settlements: by(snap.settlements, (s) => s.id),
    vocabulary: by(snap.vocabulary, (v) => `${v.kind}:${v.key}`),
  };
}

describe('il giro completo: esporta, rileggi, ricostruisci', () => {
  /**
   * **È l'unico test che chiude il cerchio, ed è il motivo per cui sta qui.**
   *
   * `import.test.ts` nel core arriva fino alla fotografia riletta; `encodeSnapshotAsState`
   * parte da una fotografia scritta a mano. In mezzo non c'era nessuno a dire che le due
   * combaciano — ed è in mezzo che vive la promessa della schermata, «per conservarli».
   * Un campo aggiunto al modello e dimenticato in `readExpense` passerebbe da entrambi i
   * test di prima senza che nessuno se ne accorga; da questo no.
   */
  it('il vault che rientra è identico a quello che è uscito', () => {
    const conTombstone: VaultSnapshot = {
      ...snapshot,
      expenses: [
        ...snapshot.expenses,
        {
          ...snapshot.expenses[0]!,
          id: 'e2',
          note: 'cancellata di proposito',
          deletedAt: '2026-07-06T08:00:00.000Z',
        },
      ],
      settlements: [
        {
          id: 's1',
          fromMember: 'bruno',
          toMember: 'anna',
          amountCents: 1250,
          date: '2026-07-05',
          note: '',
          createdAt: '2026-07-05T09:00:00.000Z',
          deletedAt: null,
        },
      ],
      vocabulary: [{ kind: 'tag', key: 'casa', name: 'casa', deletedAt: null }],
    };

    const file = toJsonExport(conTombstone, { groupName: 'Casa', app: '1.0.0' });
    const result = parseVaultExport(file);
    if (!result.ok) throw new Error(`il file appena scritto è stato rifiutato: ${result.reason}`);

    expect(result.report.skipped).toEqual([]);
    expect(result.report.groupName).toBe('Casa');

    const store = reopen(encodeSnapshotAsState(result.snapshot, random));
    // `toEqual` sull'intera fotografia, non campo per campo: un campo nuovo dimenticato da
    // qualche parte lungo il giro fa fallire questo confronto e nessun altro.
    expect(normalized(store.snapshot())).toEqual(normalized(conTombstone));
  });

  it('la spesa cancellata resta cancellata, invece di resuscitare', () => {
    // Un backup che fa riapparire spese cancellate di proposito è peggio di nessun backup.
    const conTombstone: VaultSnapshot = {
      ...snapshot,
      expenses: [
        ...snapshot.expenses,
        { ...snapshot.expenses[0]!, id: 'e2', deletedAt: '2026-07-06T08:00:00.000Z' },
      ],
    };

    const result = parseVaultExport(toJsonExport(conTombstone));
    if (!result.ok) throw new Error(result.reason);

    const store = reopen(encodeSnapshotAsState(result.snapshot, random));
    expect(store.listExpenses().map((e) => e.id)).toEqual(['e1']);
    expect(store.snapshot().expenses).toHaveLength(2);
  });
});
