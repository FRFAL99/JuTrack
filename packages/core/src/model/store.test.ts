import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { testRandom } from '../crypto/testing';
import { expensesMap, writeRecord } from './doc';
import { assertSplitBalances, buildSplit, VaultStore } from './store';

function makeStore(): VaultStore {
  return new VaultStore(new Y.Doc(), { random: testRandom });
}

/** Store con due membri, come nell'uso reale dell'app. */
function makeCouple() {
  const store = makeStore();
  const a = store.addMember({ name: 'Francesco' });
  const b = store.addMember({ name: 'Giulia' });
  return { store, a: a.id, b: b.id };
}

describe('buildSplit', () => {
  it('divide in parti uguali', () => {
    const split = buildSplit('equal', 1000, ['a', 'b']);
    expect(split.shares).toEqual({ a: 500, b: 500 });
  });

  it('non perde centesimi su importi dispari', () => {
    const split = buildSplit('equal', 1001, ['a', 'b']);
    expect(split.shares).toEqual({ a: 501, b: 500 });
    expect(Object.values(split.shares).reduce((x, y) => x + y, 0)).toBe(1001);
  });

  it('assegna tutto a una persona in modalità single', () => {
    expect(buildSplit('single', 1000, ['a', 'b']).shares).toEqual({ a: 1000 });
  });

  it('rispetta i pesi in modalità custom', () => {
    expect(buildSplit('custom', 1000, ['a', 'b'], [3, 1]).shares).toEqual({ a: 750, b: 250 });
  });

  it('rifiuta zero partecipanti', () => {
    expect(() => buildSplit('equal', 1000, [])).toThrow(/almeno un partecipante/);
  });
});

describe('assertSplitBalances', () => {
  it('accetta uno split che somma al totale', () => {
    expect(() =>
      assertSplitBalances({ mode: 'equal', shares: { a: 500, b: 500 } }, 1000),
    ).not.toThrow();
  });

  it('rifiuta uno split che non torna', () => {
    // È il bug che questa funzione esiste per prevenire: quote che sommano a 999
    // su una spesa di 1000 producono un saldo sbagliato di un centesimo.
    expect(() => assertSplitBalances({ mode: 'equal', shares: { a: 500, b: 499 } }, 1000)).toThrow(
      /sommano a 999/,
    );
  });

  it('rifiuta quote non intere', () => {
    expect(() => assertSplitBalances({ mode: 'equal', shares: { a: 500.5 } }, 500.5)).toThrow(
      /quota non valido/,
    );
  });
});

describe('VaultStore — spese', () => {
  it('crea e rilegge una spesa', () => {
    const { store, a, b } = makeCouple();
    const created = store.addExpense({
      amountCents: 1230,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('equal', 1230, [a, b]),
      note: 'Spesa alimentare',
    });

    const read = store.getExpense(created.id);
    expect(read?.amountCents).toBe(1230);
    expect(read?.note).toBe('Spesa alimentare');
    expect(read?.paidBy).toBe(a);
    expect(read?.deletedAt).toBeNull();
  });

  it('assegna id diversi a spese diverse', () => {
    const { store, a } = makeCouple();
    const input = {
      amountCents: 100,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('single', 100, [a]),
    };
    expect(store.addExpense(input).id).not.toBe(store.addExpense(input).id);
  });

  it('rifiuta un importo negativo', () => {
    const { store, a } = makeCouple();
    expect(() =>
      store.addExpense({
        amountCents: -100,
        date: '2026-08-01',
        paidBy: a,
        split: { mode: 'single', shares: { [a]: -100 } },
      }),
    ).toThrow(/non può essere negativo/);
  });

  it('rifiuta uno split incoerente', () => {
    const { store, a, b } = makeCouple();
    expect(() =>
      store.addExpense({
        amountCents: 1000,
        date: '2026-08-01',
        paidBy: a,
        split: { mode: 'equal', shares: { [a]: 400, [b]: 400 } },
      }),
    ).toThrow(/sommano a 800/);
  });

  it('aggiorna solo i campi indicati', () => {
    const { store, a, b } = makeCouple();
    const created = store.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('equal', 1000, [a, b]),
      note: 'originale',
    });

    store.updateExpense(created.id, { note: 'modificata' });
    const updated = store.getExpense(created.id);
    expect(updated?.note).toBe('modificata');
    expect(updated?.amountCents).toBe(1000); // non toccato
    expect(updated?.date).toBe('2026-08-01');
  });

  it('impedisce di cambiare importo lasciando uno split ormai incoerente', () => {
    // Senza questo controllo, portare una spesa da 10 a 20 euro lascerebbe le quote
    // a 5+5: il saldo direbbe che uno dei due deve 5 euro in meno del dovuto.
    const { store, a, b } = makeCouple();
    const created = store.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('equal', 1000, [a, b]),
    });
    expect(() => store.updateExpense(created.id, { amountCents: 2000 })).toThrow(/sommano a 1000/);
  });

  it('accetta il cambio di importo se accompagnato da un nuovo split', () => {
    const { store, a, b } = makeCouple();
    const created = store.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('equal', 1000, [a, b]),
    });
    const updated = store.updateExpense(created.id, {
      amountCents: 2000,
      split: buildSplit('equal', 2000, [a, b]),
    });
    expect(updated.amountCents).toBe(2000);
    expect(updated.split.shares[a]).toBe(1000);
  });

  it('cancella con tombstone invece di rimuovere il record', () => {
    const { store, a } = makeCouple();
    const created = store.addExpense({
      amountCents: 500,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('single', 500, [a]),
    });

    store.deleteExpense(created.id);

    // Sparita dalla lista...
    expect(store.listExpenses()).toHaveLength(0);
    // ...ma il record esiste ancora, altrimenti l'altro dispositivo la rimanderebbe.
    expect(store.getExpense(created.id)?.deletedAt).not.toBeNull();
    expect(store.listExpenses({ includeDeleted: true })).toHaveLength(1);
  });

  it('ripristina una spesa cancellata', () => {
    const { store, a } = makeCouple();
    const created = store.addExpense({
      amountCents: 500,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('single', 500, [a]),
    });
    store.deleteExpense(created.id);
    store.restoreExpense(created.id);
    expect(store.listExpenses()).toHaveLength(1);
  });

  it('ignora la cancellazione di una spesa inesistente', () => {
    expect(() => makeStore().deleteExpense('inesistente')).not.toThrow();
  });
});

describe('VaultStore — negozio e tag', () => {
  function withExtras(extras: { store?: string; tags?: string[] } = {}) {
    const { store: vault, a } = makeCouple();
    const created = vault.addExpense({
      amountCents: 500,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('single', 500, [a]),
      ...extras,
    });
    return { vault, expense: vault.getExpense(created.id) };
  }

  it('una spesa senza negozio legge la stringa vuota', () => {
    expect(withExtras().expense?.store).toBe('');
  });

  it('una spesa senza tag legge un array vuoto', () => {
    expect(withExtras().expense?.tags).toEqual([]);
  });

  it('conserva il negozio ripulendo gli spazi', () => {
    expect(withExtras({ store: '  Bar   Rossi ' }).expense?.store).toBe('Bar Rossi');
  });

  it('deduplica i tag sulla chiave normalizzata', () => {
    // Due grafie della stessa etichetta produrrebbero due barre nei grafici.
    expect(withExtras({ tags: ['Spesa', 'spesa', ' SPESA '] }).expense?.tags).toEqual(['Spesa']);
  });

  it('aggiorna negozio e tag senza toccare il resto', () => {
    const { vault, expense } = withExtras({ store: 'Coop', tags: ['casa'] });
    const updated = vault.updateExpense(expense?.id as string, {
      store: 'Esselunga',
      tags: ['casa', 'regalo'],
    });
    expect(updated.store).toBe('Esselunga');
    expect(updated.tags).toEqual(['casa', 'regalo']);
    expect(updated.amountCents).toBe(500);
  });

  it('un tag scritto due volte non raddoppia in aggiornamento', () => {
    const { vault, expense } = withExtras();
    expect(
      vault.updateExpense(expense?.id as string, { tags: ['viaggio', 'Viaggio'] }).tags,
    ).toEqual(['viaggio']);
  });

  it('un tags non-array non fa saltare la lettura', () => {
    // Il valore arriva da un altro dispositivo, che può avere una versione diversa
    // dell'app: `listExpenses` è la lettura da cui dipende tutta la lista spese, e non
    // deve sollevare per un campo che non ha la forma attesa.
    const { store, a } = makeCouple();
    const created = store.addExpense({
      amountCents: 500,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('single', 500, [a]),
    });
    store.transact(() => {
      writeRecord(expensesMap(store.doc), created.id, { tags: 42, store: 7 });
    });

    const read = store.listExpenses();
    expect(read).toHaveLength(1);
    expect(read[0]?.tags).toEqual([]);
    expect(read[0]?.store).toBe('');
  });

  it('scarta i non-stringa dentro un array di tag', () => {
    const { store, a } = makeCouple();
    const created = store.addExpense({
      amountCents: 500,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('single', 500, [a]),
    });
    store.transact(() => {
      writeRecord(expensesMap(store.doc), created.id, { tags: ['buono', 3, null] });
    });
    expect(store.getExpense(created.id)?.tags).toEqual(['buono']);
  });

  it('legge una spesa scritta prima che i due campi esistessero', () => {
    // Nessun backfill: un record vecchio non ha le chiavi, e i fallback dei reader sono
    // ciò che rende additivo il cambio di modello.
    const store = makeStore();
    store.transact(() => {
      writeRecord(expensesMap(store.doc), 'vecchia', {
        amountCents: 500,
        currency: 'EUR',
        date: '2026-01-01',
        categoryId: null,
        note: 'di prima',
        paidBy: 'anna',
        split: { mode: 'single', shares: { anna: 500 } },
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-01-01T10:00:00.000Z',
        deletedAt: null,
      });
    });
    expect(store.getExpense('vecchia')).toMatchObject({ store: '', tags: [], note: 'di prima' });
  });
});

describe('VaultStore — filtri e ordinamento', () => {
  function seeded() {
    const { store, a, b } = makeCouple();
    const food = store.addCategory({ name: 'Cibo' });
    const fun = store.addCategory({ name: 'Svago' });
    const add = (date: string, cents: number, categoryId: string) =>
      store.addExpense({
        amountCents: cents,
        date,
        paidBy: a,
        categoryId,
        split: buildSplit('equal', cents, [a, b]),
      });
    add('2026-07-15', 100, food.id);
    add('2026-08-01', 200, food.id);
    add('2026-08-10', 300, fun.id);
    return { store, food, fun };
  }

  it('ordina per data decrescente', () => {
    expect(
      seeded()
        .store.listExpenses()
        .map((e) => e.date),
    ).toEqual(['2026-08-10', '2026-08-01', '2026-07-15']);
  });

  it('filtra per intervallo di date, estremi inclusi', () => {
    const { store } = seeded();
    expect(store.listExpenses({ from: '2026-08-01', to: '2026-08-10' })).toHaveLength(2);
    expect(store.listExpenses({ from: '2026-08-02' })).toHaveLength(1);
    expect(store.listExpenses({ to: '2026-07-15' })).toHaveLength(1);
  });

  it('filtra per categoria', () => {
    const { store, food } = seeded();
    expect(store.listExpenses({ categoryId: food.id })).toHaveLength(2);
  });

  it('produce lo stesso ordine a parità di data e istante di creazione', () => {
    // I due dispositivi devono mostrare la stessa lista: senza un criterio finale
    // sull'id, l'ordine dipenderebbe dall'ordine di iterazione della Y.Map.
    const { store, a } = makeCouple();
    const now = () => new Date('2026-08-01T10:00:00.000Z');
    const fixed = new VaultStore(store.doc, { random: testRandom, now });
    for (let i = 0; i < 5; i++) {
      fixed.addExpense({
        amountCents: 100,
        date: '2026-08-01',
        paidBy: a,
        split: buildSplit('single', 100, [a]),
      });
    }
    expect(fixed.listExpenses().map((e) => e.id)).toEqual(fixed.listExpenses().map((e) => e.id));
  });
});

describe('VaultStore — categorie, membri, budget, pareggi', () => {
  it('elenca le categorie in ordine alfabetico ed esclude le archiviate', () => {
    const store = makeStore();
    store.addCategory({ name: 'Svago' });
    store.addCategory({ name: 'Casa' });
    const old = store.addCategory({ name: 'Vecchia' });
    store.updateCategory(old.id, { archived: true });

    expect(store.listCategories().map((c) => c.name)).toEqual(['Casa', 'Svago']);
    expect(store.listCategories(true)).toHaveLength(3);
  });

  it('scrive il membro con l id scelto da chi chiama, senza duplicarlo', () => {
    // È il meccanismo che toglie i membri doppi: due dispositivi passano lo **stesso**
    // `profileId` per la stessa persona, invece di generarsi ciascuno un id casuale.
    const store = makeStore();
    store.setMember('profilo-francesco', { name: 'Francesco', color: '#3B5BDB' });
    store.setMember('profilo-francesco', { name: 'Francesco', color: '#3B5BDB' });

    expect(store.listMembers()).toHaveLength(1);
    expect(store.getMember('profilo-francesco')?.name).toBe('Francesco');
  });

  it('propaga il cambio di nome sullo stesso membro', () => {
    const store = makeStore();
    store.setMember('profilo-giulia', { name: 'Giulia' });
    store.setMember('profilo-giulia', { name: 'Giulia B.' });

    expect(store.listMembers()).toHaveLength(1);
    expect(store.getMember('profilo-giulia')?.name).toBe('Giulia B.');
  });

  it('memorizza e rilegge un budget mensile', () => {
    const store = makeStore();
    const cat = store.addCategory({ name: 'Cibo' });
    store.setBudget(cat.id, '2026-08', 40_000);

    expect(store.getBudget(cat.id, '2026-08')?.limitCents).toBe(40_000);
    expect(store.getBudget(cat.id, '2026-09')).toBeNull();
    expect(store.listBudgets('2026-08')).toHaveLength(1);
  });

  it('rifiuta un budget negativo', () => {
    const store = makeStore();
    expect(() => store.setBudget('cat', '2026-08', -1)).toThrow(/non può essere negativo/);
  });

  it('registra un pareggio fra due membri', () => {
    const { store, a, b } = makeCouple();
    const settlement = store.addSettlement({
      fromMember: a,
      toMember: b,
      amountCents: 2500,
      date: '2026-08-01',
    });
    expect(store.listSettlements()).toHaveLength(1);
    store.deleteSettlement(settlement.id);
    expect(store.listSettlements()).toHaveLength(0);
  });

  it('rifiuta un pareggio verso se stessi', () => {
    const { store, a } = makeCouple();
    expect(() =>
      store.addSettlement({ fromMember: a, toMember: a, amountCents: 100, date: '2026-08-01' }),
    ).toThrow(/due membri diversi/);
  });

  it('rifiuta un pareggio di importo nullo o negativo', () => {
    const { store, a, b } = makeCouple();
    expect(() =>
      store.addSettlement({ fromMember: a, toMember: b, amountCents: 0, date: '2026-08-01' }),
    ).toThrow(/deve essere positivo/);
  });
});

describe('nome del gruppo', () => {
  it('parte da null e conserva quello che scrive', () => {
    const store = makeStore();
    expect(store.getGroupName()).toBeNull();
    store.setGroupName('Casa');
    expect(store.getGroupName()).toBe('Casa');
  });

  it('tratta il nome vuoto come assente', () => {
    // Un gruppo con il nome «» comparirebbe nella lista come una riga senza etichetta,
    // impossibile da distinguere dalle altre. Meglio il fallback del registro.
    const store = makeStore();
    store.setGroupName('');
    expect(store.getGroupName()).toBeNull();
  });

  it('viaggia fra due documenti come qualunque altra modifica', () => {
    // È la ragione per cui il nome sta nel vault e non nella riga di registro: rinominare
    // un gruppo deve raggiungere l'altro telefono da solo, senza un canale a parte.
    const qui = makeStore();
    const là = makeStore();
    qui.setGroupName('Viaggio in Grecia');

    Y.applyUpdate(là.doc, Y.encodeStateAsUpdate(qui.doc));

    expect(là.getGroupName()).toBe('Viaggio in Grecia');
  });

  it('non finisce nello snapshot delle collezioni', () => {
    // `snapshot()` è la fotografia dei record per l'export, non delle proprietà del
    // gruppo: aggiungerci il nome cambierebbe il formato JSON già documentato.
    const store = makeStore();
    store.setGroupName('Casa');
    expect(Object.keys(store.snapshot()).sort()).toEqual([
      'budgets',
      'categories',
      'expenses',
      'members',
      'settlements',
    ]);
  });
});

describe('snapshot', () => {
  it('raccoglie tutte e cinque le collezioni', () => {
    const { store, a, b } = makeCouple();
    const category = store.addCategory({ name: 'Spesa' });
    store.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('equal', 1000, [a, b]),
      categoryId: category.id,
    });
    store.setBudget(category.id, '2026-08', 50000);
    store.addSettlement({ fromMember: b, toMember: a, amountCents: 500, date: '2026-08-02' });

    const snapshot = store.snapshot();
    expect(snapshot.expenses).toHaveLength(1);
    expect(snapshot.categories).toHaveLength(1);
    expect(snapshot.members).toHaveLength(2);
    expect(snapshot.budgets).toHaveLength(1);
    expect(snapshot.settlements).toHaveLength(1);
  });

  it('include i tombstone di default, e li esclude su richiesta', () => {
    const { store, a, b } = makeCouple();
    const expense = store.addExpense({
      amountCents: 1000,
      date: '2026-08-01',
      paidBy: a,
      split: buildSplit('equal', 1000, [a, b]),
    });
    store.deleteExpense(expense.id);

    expect(store.snapshot().expenses).toHaveLength(1);
    expect(store.snapshot(false).expenses).toHaveLength(0);
  });

  it('include le categorie archiviate: le spese passate le riferiscono ancora', () => {
    const store = makeStore();
    const category = store.addCategory({ name: 'Vacanze' });
    store.updateCategory(category.id, { archived: true });
    expect(store.snapshot().categories).toHaveLength(1);
  });
});
