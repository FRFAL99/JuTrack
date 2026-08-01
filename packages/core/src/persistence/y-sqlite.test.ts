import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { testRandom } from '../crypto/testing';
import { buildSplit, VaultStore } from '../model/store';
import { MemoryDatabase } from './memory-db';
import { SqliteYPersistence } from './y-sqlite';

const ME = 'membro-a';

function addExpense(store: VaultStore, cents: number, note = ''): void {
  store.addExpense({
    amountCents: cents,
    date: '2026-08-01',
    paidBy: ME,
    note,
    split: buildSplit('single', cents, [ME]),
  });
}

describe('SqliteYPersistence', () => {
  it('ricarica le spese dopo un riavvio', async () => {
    // Simula la chiusura e riapertura dell'app: database condiviso, Y.Doc nuovo.
    const db = new MemoryDatabase();

    const doc1 = new Y.Doc();
    const p1 = new SqliteYPersistence(db, doc1);
    await p1.load();
    const store1 = new VaultStore(doc1, { random: testRandom });
    addExpense(store1, 1230, 'spesa alimentare');
    addExpense(store1, 450, 'caffè');
    await p1.destroy();

    const doc2 = new Y.Doc();
    const p2 = new SqliteYPersistence(db, doc2);
    await p2.load();
    const store2 = new VaultStore(doc2, { random: testRandom });

    const restored = store2.listExpenses();
    expect(restored).toHaveLength(2);
    expect(restored.map((e) => e.note).sort()).toEqual(['caffè', 'spesa alimentare']);
  });

  it('conserva le modifiche, non solo le creazioni', async () => {
    const db = new MemoryDatabase();
    const doc1 = new Y.Doc();
    const p1 = new SqliteYPersistence(db, doc1);
    await p1.load();
    const store1 = new VaultStore(doc1, { random: testRandom });
    addExpense(store1, 1000, 'prima');
    const id = store1.listExpenses()[0]?.id as string;
    store1.updateExpense(id, { note: 'dopo' });
    await p1.destroy();

    const doc2 = new Y.Doc();
    const p2 = new SqliteYPersistence(db, doc2);
    await p2.load();
    expect(new VaultStore(doc2, { random: testRandom }).getExpense(id)?.note).toBe('dopo');
  });

  it('conserva le cancellazioni', async () => {
    const db = new MemoryDatabase();
    const doc1 = new Y.Doc();
    const p1 = new SqliteYPersistence(db, doc1);
    await p1.load();
    const store1 = new VaultStore(doc1, { random: testRandom });
    addExpense(store1, 1000);
    const id = store1.listExpenses()[0]?.id as string;
    store1.deleteExpense(id);
    await p1.destroy();

    const doc2 = new Y.Doc();
    const p2 = new SqliteYPersistence(db, doc2);
    await p2.load();
    // La spesa cancellata non deve ricomparire al riavvio.
    expect(new VaultStore(doc2, { random: testRandom }).listExpenses()).toHaveLength(0);
  });

  it('parte da vuoto su un database nuovo', async () => {
    const doc = new Y.Doc();
    const p = new SqliteYPersistence(new MemoryDatabase(), doc);
    await p.load();
    expect(new VaultStore(doc, { random: testRandom }).listExpenses()).toHaveLength(0);
  });

  it('compatta il log oltre la soglia', async () => {
    // Senza compattazione il tempo di avvio crescerebbe con la storia completa del vault.
    const db = new MemoryDatabase();
    const doc = new Y.Doc();
    const p = new SqliteYPersistence(db, doc, { compactAfter: 5 });
    await p.load();
    const store = new VaultStore(doc, { random: testRandom });

    for (let i = 0; i < 20; i++) addExpense(store, 100 + i);
    await p.flush();

    // Molte scritture, ma poche righe conservate.
    expect(await p.countStoredUpdates()).toBeLessThanOrEqual(5);
    // ...e nessun dato perso.
    expect(store.listExpenses()).toHaveLength(20);
  });

  it('dopo la compattazione ricarica lo stato completo', async () => {
    const db = new MemoryDatabase();
    const doc1 = new Y.Doc();
    const p1 = new SqliteYPersistence(db, doc1, { compactAfter: 3 });
    await p1.load();
    const store1 = new VaultStore(doc1, { random: testRandom });
    for (let i = 0; i < 15; i++) addExpense(store1, 100 + i, `spesa ${i}`);
    await p1.destroy();

    expect(db.rowCount).toBeLessThanOrEqual(3);

    const doc2 = new Y.Doc();
    const p2 = new SqliteYPersistence(db, doc2, { compactAfter: 3 });
    await p2.load();
    expect(new VaultStore(doc2, { random: testRandom }).listExpenses()).toHaveLength(15);
  });

  it('non riscrive gli update che ha appena caricato', async () => {
    // Se `load` riapplicasse i propri update al documento senza marcarne l'origine,
    // l'observer li riscriverebbe sul database a ogni avvio, e il log crescerebbe
    // anche senza che l'utente faccia nulla.
    const db = new MemoryDatabase();
    const doc1 = new Y.Doc();
    const p1 = new SqliteYPersistence(db, doc1);
    await p1.load();
    addExpense(new VaultStore(doc1, { random: testRandom }), 1000);
    await p1.destroy();

    const rowsAfterFirstRun = db.rowCount;

    const doc2 = new Y.Doc();
    const p2 = new SqliteYPersistence(db, doc2);
    await p2.load();
    await p2.flush();
    await p2.destroy();

    expect(db.rowCount).toBe(rowsAfterFirstRun);
  });

  it('cancella tutto con clear', async () => {
    const db = new MemoryDatabase();
    const doc = new Y.Doc();
    const p = new SqliteYPersistence(db, doc);
    await p.load();
    addExpense(new VaultStore(doc, { random: testRandom }), 1000);
    await p.flush();
    expect(db.rowCount).toBeGreaterThan(0);

    await p.clear();
    expect(db.rowCount).toBe(0);
  });

  it('smette di scrivere dopo destroy', async () => {
    const db = new MemoryDatabase();
    const doc = new Y.Doc();
    const p = new SqliteYPersistence(db, doc);
    await p.load();
    const store = new VaultStore(doc, { random: testRandom });
    addExpense(store, 1000);
    await p.destroy();

    const rowsAtDestroy = db.rowCount;
    addExpense(store, 2000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(db.rowCount).toBe(rowsAtDestroy);
  });

  it('sopravvive a una compattazione interrotta a metà', async () => {
    // Simula il caso in cui il processo muore fra INSERT e DELETE: sul database
    // restano i vecchi update più lo snapshot. Poiché gli update Yjs sono
    // idempotenti, il documento ricaricato deve risultare comunque corretto.
    const db = new MemoryDatabase();
    const doc1 = new Y.Doc();
    const p1 = new SqliteYPersistence(db, doc1);
    await p1.load();
    const store1 = new VaultStore(doc1, { random: testRandom });
    for (let i = 0; i < 5; i++) addExpense(store1, 100 + i, `spesa ${i}`);
    await p1.flush();

    // Snapshot aggiunto senza cancellare nulla: è lo stato "a metà compattazione".
    await db.execute('INSERT INTO y_updates (data) VALUES (?)', [Y.encodeStateAsUpdate(doc1)]);
    await p1.destroy();

    const doc2 = new Y.Doc();
    const p2 = new SqliteYPersistence(db, doc2);
    await p2.load();
    expect(new VaultStore(doc2, { random: testRandom }).listExpenses()).toHaveLength(5);
  });
});
