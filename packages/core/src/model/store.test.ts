import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { testRandom } from '../crypto/testing';
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
