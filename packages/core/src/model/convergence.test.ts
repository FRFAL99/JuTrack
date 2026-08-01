/**
 * Convergenza CRDT.
 *
 * Questi test riproducono lo scenario che giustifica l'intera architettura: due telefoni
 * offline che modificano gli stessi dati e devono arrivare allo stesso stato quando la
 * rete torna, senza perdere spese e senza chiedere all'utente di risolvere conflitti.
 *
 * Se questi test cadono, la scelta di Yjs non sta reggendo la promessa fatta.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { testRandom } from '../crypto/testing';
import { buildSplit, VaultStore } from './store';

/** Due dispositivi separati, come due telefoni distinti. */
function twoDevices() {
  const docA = new Y.Doc();
  const docB = new Y.Doc();
  return {
    docA,
    docB,
    storeA: new VaultStore(docA, { random: testRandom }),
    storeB: new VaultStore(docB, { random: testRandom }),
  };
}

/** Sincronizza i due documenti in entrambe le direzioni, come farebbe il relay. */
function sync(docA: Y.Doc, docB: Y.Doc): void {
  const updateForB = Y.encodeStateAsUpdate(docA, Y.encodeStateVector(docB));
  const updateForA = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA));
  Y.applyUpdate(docB, updateForB);
  Y.applyUpdate(docA, updateForA);
}

describe('convergenza fra due dispositivi', () => {
  it('unisce spese create offline su entrambi', () => {
    // Lo scenario centrale: entrambi in aereo, ciascuno registra le proprie spese.
    const { docA, docB, storeA, storeB } = twoDevices();
    const me = 'membro-a';
    const you = 'membro-b';

    for (let i = 0; i < 3; i++) {
      storeA.addExpense({
        amountCents: 100 * (i + 1),
        date: '2026-08-01',
        paidBy: me,
        note: `da A ${i}`,
        split: buildSplit('equal', 100 * (i + 1), [me, you]),
      });
      storeB.addExpense({
        amountCents: 200 * (i + 1),
        date: '2026-08-02',
        paidBy: you,
        note: `da B ${i}`,
        split: buildSplit('equal', 200 * (i + 1), [me, you]),
      });
    }

    expect(storeA.listExpenses()).toHaveLength(3);
    expect(storeB.listExpenses()).toHaveLength(3);

    sync(docA, docB);

    // Nessuna spesa persa, nessuna duplicata.
    expect(storeA.listExpenses()).toHaveLength(6);
    expect(storeB.listExpenses()).toHaveLength(6);
    expect(storeA.listExpenses()).toEqual(storeB.listExpenses());
  });

  it('fonde modifiche a campi diversi della stessa spesa', () => {
    // È la ragione per cui ogni record è una Y.Map e non un oggetto piatto:
    // se io cambio la nota mentre tu cambi la categoria, sopravvivono entrambe.
    const { docA, docB, storeA, storeB } = twoDevices();
    const me = 'membro-a';

    const created = storeA.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: me,
      note: 'originale',
      split: buildSplit('single', 1000, [me]),
    });
    sync(docA, docB);

    storeA.updateExpense(created.id, { note: 'nota cambiata da A' });
    storeB.updateExpense(created.id, { categoryId: 'categoria-da-B' });

    sync(docA, docB);

    const fromA = storeA.getExpense(created.id);
    expect(fromA?.note).toBe('nota cambiata da A');
    expect(fromA?.categoryId).toBe('categoria-da-B');
    expect(fromA).toEqual(storeB.getExpense(created.id));
  });

  it('converge su una modifica concorrente dello stesso campo', () => {
    // Qui una delle due modifiche deve necessariamente vincere: non esiste un modo
    // sensato di fondere due note diverse. Ciò che conta è che i due dispositivi
    // scelgano la *stessa*, senza crash e senza duplicare la spesa.
    const { docA, docB, storeA, storeB } = twoDevices();
    const me = 'membro-a';

    const created = storeA.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: me,
      split: buildSplit('single', 1000, [me]),
    });
    sync(docA, docB);

    storeA.updateExpense(created.id, { note: 'versione A' });
    storeB.updateExpense(created.id, { note: 'versione B' });

    sync(docA, docB);

    const noteA = storeA.getExpense(created.id)?.note;
    expect(noteA).toEqual(storeB.getExpense(created.id)?.note);
    expect(['versione A', 'versione B']).toContain(noteA);
    expect(storeA.listExpenses()).toHaveLength(1);
  });

  it('mantiene lo split coerente anche in caso di conflitto', () => {
    // Motivo per cui lo split è memorizzato come valore unico e non come Y.Map
    // annidata: una fusione campo per campo potrebbe combinare il `mode` di un
    // dispositivo con le `shares` dell'altro, producendo quote che non sommano
    // al totale — cioè un saldo sbagliato.
    const { docA, docB, storeA, storeB } = twoDevices();
    const me = 'membro-a';
    const you = 'membro-b';

    const created = storeA.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: me,
      split: buildSplit('equal', 1000, [me, you]),
    });
    sync(docA, docB);

    storeA.updateExpense(created.id, { split: buildSplit('single', 1000, [me]) });
    storeB.updateExpense(created.id, { split: buildSplit('custom', 1000, [me, you], [3, 1]) });

    sync(docA, docB);

    const merged = storeA.getExpense(created.id);
    expect(merged).toEqual(storeB.getExpense(created.id));

    const total = Object.values(merged?.split.shares ?? {}).reduce((a, b) => a + b, 0);
    expect(total, 'le quote devono sempre sommare al totale').toBe(1000);
  });

  it('propaga la cancellazione senza far ricomparire la spesa', () => {
    // Il caso che giustifica i tombstone: A cancella, B nel frattempo modifica.
    // Dopo il sync la spesa deve restare cancellata su entrambi.
    const { docA, docB, storeA, storeB } = twoDevices();
    const me = 'membro-a';

    const created = storeA.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: me,
      split: buildSplit('single', 1000, [me]),
    });
    sync(docA, docB);

    storeA.deleteExpense(created.id);
    storeB.updateExpense(created.id, { note: 'modificata mentre A cancellava' });

    sync(docA, docB);

    expect(storeA.listExpenses()).toHaveLength(0);
    expect(storeB.listExpenses()).toHaveLength(0);
    expect(storeA.listExpenses()).toEqual(storeB.listExpenses());
  });

  it('converge indipendentemente dall ordine di applicazione degli update', () => {
    // Il relay non garantisce l'ordine di consegna. Gli update Yjs sono commutativi:
    // applicarli al contrario deve dare lo stesso risultato.
    const source = new Y.Doc();
    const store = new VaultStore(source, { random: testRandom });
    const me = 'membro-a';

    const updates: Uint8Array[] = [];
    source.on('update', (u: Uint8Array) => updates.push(u));

    for (let i = 0; i < 5; i++) {
      store.addExpense({
        amountCents: 100 * (i + 1),
        date: `2026-08-0${i + 1}`,
        paidBy: me,
        split: buildSplit('single', 100 * (i + 1), [me]),
      });
    }

    const forward = new Y.Doc();
    for (const u of updates) Y.applyUpdate(forward, u);

    const reversed = new Y.Doc();
    for (const u of [...updates].reverse()) Y.applyUpdate(reversed, u);

    const readForward = new VaultStore(forward, { random: testRandom }).listExpenses();
    const readReversed = new VaultStore(reversed, { random: testRandom }).listExpenses();

    expect(readReversed).toEqual(readForward);
    expect(readForward).toHaveLength(5);
  });

  it('è idempotente: applicare due volte lo stesso update non duplica nulla', () => {
    // Il client può ricevere lo stesso blob due volte dopo un retry di rete.
    const source = new Y.Doc();
    const store = new VaultStore(source, { random: testRandom });
    const me = 'membro-a';
    store.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: me,
      split: buildSplit('single', 1000, [me]),
    });

    const update = Y.encodeStateAsUpdate(source);
    const target = new Y.Doc();
    Y.applyUpdate(target, update);
    Y.applyUpdate(target, update);

    expect(new VaultStore(target, { random: testRandom }).listExpenses()).toHaveLength(1);
  });
});
