/**
 * API applicativa sopra il documento Yjs.
 *
 * La UI non tocca mai direttamente le `Y.Map`: passa da qui, dove vivono le invarianti
 * (importi interi, quote che sommano al totale, tombstone invece di cancellazioni).
 */
import * as Y from 'yjs';
import type { RandomSource } from '../crypto/types';
import {
  budgetsMap,
  budgetKey,
  categoriesMap,
  expensesMap,
  membersMap,
  metaMap,
  readBudget,
  readCategory,
  readExpense,
  readMember,
  readSettlement,
  settlementsMap,
  writeRecord,
} from './doc';
import { normalizeStore, normalizeTags } from '../insights/naming';
import { newId } from './ids';
import { assertCents, splitByWeights, splitEvenly, type Cents } from './money';
import type {
  Budget,
  Category,
  Expense,
  ExpenseSplit,
  IsoDate,
  IsoMonth,
  Member,
  Settlement,
  SplitMode,
  VaultSnapshot,
} from './types';

export interface StoreDeps {
  random: RandomSource;
  /** Iniettabile per rendere i test deterministici. */
  now?: () => Date;
}

export interface NewExpenseInput {
  amountCents: Cents;
  date: IsoDate;
  paidBy: string;
  split: ExpenseSplit;
  categoryId?: string | null;
  note?: string;
  currency?: string;
  /** Dove è stata fatta. Normalizzato in scrittura. */
  store?: string;
  /** Etichette libere. Normalizzate e deduplicate in scrittura. */
  tags?: string[];
}

export type ExpensePatch = Partial<Omit<NewExpenseInput, never>>;

export interface ExpenseFilter {
  /** Inclusivo. */
  from?: IsoDate;
  /** Inclusivo. */
  to?: IsoDate;
  categoryId?: string;
  /** Include anche le spese cancellate. Default: `false`. */
  includeDeleted?: boolean;
}

/**
 * Verifica che le quote sommino esattamente all'importo.
 *
 * Uno split che non torna produce saldi sbagliati che nessuno nota finché non si va a
 * controllare i conti a mano. Meglio rifiutare la scrittura.
 */
export function assertSplitBalances(split: ExpenseSplit, amountCents: Cents): void {
  const values = Object.values(split.shares);
  for (const share of values) assertCents(share, 'quota');
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum !== amountCents) {
    throw new Error(
      `le quote sommano a ${sum} centesimi invece di ${amountCents}: la differenza ` +
        'produrrebbe un saldo errato',
    );
  }
}

/** Costruisce uno split coerente, distribuendo i centesimi di resto senza perderli. */
export function buildSplit(
  mode: SplitMode,
  amountCents: Cents,
  participants: string[],
  weights?: number[],
): ExpenseSplit {
  assertCents(amountCents);
  if (participants.length === 0) throw new Error('serve almeno un partecipante');

  if (mode === 'single') {
    const only = participants[0] as string;
    return { mode, shares: { [only]: amountCents } };
  }

  const amounts =
    mode === 'custom' && weights !== undefined
      ? splitByWeights(amountCents, weights)
      : splitEvenly(amountCents, participants.length);

  if (amounts.length !== participants.length) {
    throw new Error('numero di quote diverso dal numero di partecipanti');
  }

  const shares: Record<string, Cents> = {};
  participants.forEach((memberId, i) => {
    shares[memberId] = amounts[i] as number;
  });
  return { mode, shares };
}

export class VaultStore {
  readonly doc: Y.Doc;
  private readonly random: RandomSource;
  private readonly now: () => Date;

  constructor(doc: Y.Doc, deps: StoreDeps) {
    this.doc = doc;
    this.random = deps.random;
    this.now = deps.now ?? (() => new Date());
  }

  private timestamp(): string {
    return this.now().toISOString();
  }

  /**
   * Raggruppa più scritture in un unico update Yjs.
   *
   * Senza, ogni `set` genera un update separato: più traffico verso il relay e
   * osservatori della UI notificati a metà di una modifica composta.
   */
  transact<T>(fn: () => T): T {
    return this.doc.transact(fn);
  }

  /* ---------------------------- Il gruppo ------------------------------- */

  /**
   * Il nome del gruppo, `null` finché nessuno gliene ha dato uno.
   *
   * Sta dentro il vault, quindi rinominare raggiunge l'altro telefono da solo. Il
   * registro locale ne tiene una copia per disegnare la lista dei gruppi senza aprire
   * ogni documento, ma è questa la versione autorevole: in caso di divergenza è la copia
   * a doversi aggiornare.
   */
  getGroupName(): string | null {
    const value = metaMap(this.doc).get('name');
    return typeof value === 'string' && value !== '' ? value : null;
  }

  setGroupName(name: string): void {
    this.transact(() => {
      metaMap(this.doc).set('name', name);
    });
  }

  /**
   * L'intero stato del documento come update Yjs, da applicare a un documento vuoto.
   *
   * Serve a **rigenerare un gruppo**: si copia lo stato in un vault con una chiave nuova,
   * perché non esiste altro modo di escludere qualcuno da un sistema in cui la chiave *è*
   * il diritto di accesso.
   *
   * Diverso da `snapshot()`, che produce dati leggibili per l'export: qui i byte sono
   * quelli di Yjs, tombstone e struttura CRDT compresi, ed è esattamente ciò che serve
   * perché il gruppo nuovo continui la storia di quello vecchio invece di ricominciarla.
   */
  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /* ------------------------------- Spese -------------------------------- */

  addExpense(input: NewExpenseInput): Expense {
    assertCents(input.amountCents);
    if (input.amountCents < 0) throw new Error('l importo di una spesa non può essere negativo');
    assertSplitBalances(input.split, input.amountCents);

    const id = newId(this.random);
    const ts = this.timestamp();

    this.transact(() => {
      writeRecord(expensesMap(this.doc), id, {
        amountCents: input.amountCents,
        currency: input.currency ?? 'EUR',
        date: input.date,
        categoryId: input.categoryId ?? null,
        note: input.note ?? '',
        // Normalizzati **qui**, in scrittura: è l'unico punto da cui il testo entra nel
        // documento, e due grafie della stessa cosa salvate com'erano diventerebbero due
        // voci nei grafici. Vedi `insights/naming.ts`.
        store: normalizeStore(input.store ?? ''),
        tags: normalizeTags(input.tags ?? []),
        paidBy: input.paidBy,
        split: input.split,
        createdAt: ts,
        updatedAt: ts,
        deletedAt: null,
      });
    });

    return this.getExpense(id) as Expense;
  }

  updateExpense(id: string, patch: ExpensePatch): Expense {
    const current = this.getExpense(id);
    if (current === null) throw new Error(`spesa inesistente: ${id}`);

    const nextAmount = patch.amountCents ?? current.amountCents;
    if (patch.amountCents !== undefined) {
      assertCents(patch.amountCents);
      if (patch.amountCents < 0) throw new Error('l importo di una spesa non può essere negativo');
    }

    // Se cambia l'importo senza che cambi lo split, quello vecchio non tornerebbe più.
    const nextSplit = patch.split ?? current.split;
    assertSplitBalances(nextSplit, nextAmount);

    const fields: Record<string, unknown> = { updatedAt: this.timestamp() };
    if (patch.amountCents !== undefined) fields.amountCents = patch.amountCents;
    if (patch.currency !== undefined) fields.currency = patch.currency;
    if (patch.date !== undefined) fields.date = patch.date;
    if (patch.categoryId !== undefined) fields.categoryId = patch.categoryId;
    if (patch.note !== undefined) fields.note = patch.note;
    if (patch.store !== undefined) fields.store = normalizeStore(patch.store);
    // L'array si riscrive intero: non c'è un «aggiungi un tag» che si fonda con quello
    // dell'altro telefono, vince l'ultima scrittura. Vedi il commento in `readExpense`.
    if (patch.tags !== undefined) fields.tags = normalizeTags(patch.tags);
    if (patch.paidBy !== undefined) fields.paidBy = patch.paidBy;
    if (patch.split !== undefined) fields.split = patch.split;

    this.transact(() => {
      writeRecord(expensesMap(this.doc), id, fields);
    });

    return this.getExpense(id) as Expense;
  }

  /**
   * Cancella una spesa marcandola, senza rimuovere la chiave.
   *
   * Vedi docs/architecture.md: in un sistema distribuito la rimozione fisica non si
   * propaga in modo affidabile e il record ricomparirebbe dall'altro dispositivo.
   */
  deleteExpense(id: string): void {
    if (this.getExpense(id) === null) return;
    const ts = this.timestamp();
    this.transact(() => {
      writeRecord(expensesMap(this.doc), id, { deletedAt: ts, updatedAt: ts });
    });
  }

  /** Annulla una cancellazione. */
  restoreExpense(id: string): void {
    if (expensesMap(this.doc).get(id) === undefined) return;
    const ts = this.timestamp();
    this.transact(() => {
      writeRecord(expensesMap(this.doc), id, { deletedAt: null, updatedAt: ts });
    });
  }

  getExpense(id: string): Expense | null {
    const record = expensesMap(this.doc).get(id);
    return record === undefined ? null : readExpense(id, record);
  }

  /** Spese ordinate per data decrescente, poi per data di creazione decrescente. */
  listExpenses(filter: ExpenseFilter = {}): Expense[] {
    const out: Expense[] = [];
    expensesMap(this.doc).forEach((record, id) => {
      const expense = readExpense(id, record);
      if (!filter.includeDeleted && expense.deletedAt !== null) return;
      if (filter.from !== undefined && expense.date < filter.from) return;
      if (filter.to !== undefined && expense.date > filter.to) return;
      if (filter.categoryId !== undefined && expense.categoryId !== filter.categoryId) return;
      out.push(expense);
    });

    return out.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      // Ultimo criterio sull'id: senza, due spese create nello stesso istante
      // potrebbero comparire in ordine diverso sui due dispositivi.
      return a.id < b.id ? 1 : -1;
    });
  }

  /* ----------------------------- Categorie ------------------------------ */

  addCategory(input: { name: string; icon?: string; color?: string }): Category {
    const id = newId(this.random);
    this.transact(() => {
      writeRecord(categoriesMap(this.doc), id, {
        name: input.name,
        icon: input.icon ?? '📦',
        color: input.color ?? '#888888',
        archived: false,
      });
    });
    return this.getCategory(id) as Category;
  }

  updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>): void {
    if (this.getCategory(id) === null) throw new Error(`categoria inesistente: ${id}`);
    this.transact(() => {
      writeRecord(categoriesMap(this.doc), id, { ...patch });
    });
  }

  getCategory(id: string): Category | null {
    const record = categoriesMap(this.doc).get(id);
    return record === undefined ? null : readCategory(id, record);
  }

  listCategories(includeArchived = false): Category[] {
    const out: Category[] = [];
    categoriesMap(this.doc).forEach((record, id) => {
      const category = readCategory(id, record);
      if (!includeArchived && category.archived) return;
      out.push(category);
    });
    return out.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  /* ------------------------------- Membri ------------------------------- */

  addMember(input: { name: string; color?: string }): Member {
    return this.setMember(newId(this.random), input);
  }

  /**
   * Scrive un membro con un id **scelto da chi chiama**, creandolo o aggiornandolo.
   *
   * È la differenza fra «io» e «un altro io». L'app passa il proprio `profileId`, che è
   * lo stesso su tutti i gruppi e non cambia mai: due dispositivi che generano ciascuno
   * un id casuale per la stessa persona producono due membri distinti, e da lì un saldo
   * sbagliato — non solo una lista Persone dall'aspetto strano.
   *
   * Idempotente per costruzione: rieseguirla a ogni avvio non duplica nulla, e propaga
   * un cambio di nome all'altro dispositivo.
   */
  setMember(id: string, input: { name: string; color?: string }): Member {
    this.transact(() => {
      writeRecord(membersMap(this.doc), id, {
        name: input.name,
        color: input.color ?? '#888888',
      });
    });
    return this.getMember(id) as Member;
  }

  getMember(id: string): Member | null {
    const record = membersMap(this.doc).get(id);
    return record === undefined ? null : readMember(id, record);
  }

  listMembers(): Member[] {
    const out: Member[] = [];
    membersMap(this.doc).forEach((record, id) => out.push(readMember(id, record)));
    return out.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }

  /* ------------------------------- Budget ------------------------------- */

  setBudget(categoryId: string, month: IsoMonth, limitCents: Cents): void {
    assertCents(limitCents, 'limite di budget');
    if (limitCents < 0) throw new Error('il limite di budget non può essere negativo');
    this.transact(() => {
      writeRecord(budgetsMap(this.doc), budgetKey(categoryId, month), { limitCents });
    });
  }

  getBudget(categoryId: string, month: IsoMonth): Budget | null {
    const record = budgetsMap(this.doc).get(budgetKey(categoryId, month));
    return record === undefined ? null : readBudget(budgetKey(categoryId, month), record);
  }

  listBudgets(month?: IsoMonth): Budget[] {
    const out: Budget[] = [];
    budgetsMap(this.doc).forEach((record, key) => {
      const budget = readBudget(key, record);
      if (budget === null) return;
      if (month !== undefined && budget.month !== month) return;
      out.push(budget);
    });
    return out;
  }

  /* ----------------------------- Pareggi -------------------------------- */

  addSettlement(input: {
    fromMember: string;
    toMember: string;
    amountCents: Cents;
    date: IsoDate;
    note?: string;
  }): Settlement {
    assertCents(input.amountCents, 'importo del pareggio');
    if (input.amountCents <= 0) throw new Error('l importo di un pareggio deve essere positivo');
    if (input.fromMember === input.toMember) {
      throw new Error('un pareggio richiede due membri diversi');
    }

    const id = newId(this.random);
    this.transact(() => {
      writeRecord(settlementsMap(this.doc), id, {
        fromMember: input.fromMember,
        toMember: input.toMember,
        amountCents: input.amountCents,
        date: input.date,
        note: input.note ?? '',
        createdAt: this.timestamp(),
        deletedAt: null,
      });
    });
    return this.getSettlement(id) as Settlement;
  }

  deleteSettlement(id: string): void {
    if (settlementsMap(this.doc).get(id) === undefined) return;
    this.transact(() => {
      writeRecord(settlementsMap(this.doc), id, { deletedAt: this.timestamp() });
    });
  }

  getSettlement(id: string): Settlement | null {
    const record = settlementsMap(this.doc).get(id);
    return record === undefined ? null : readSettlement(id, record);
  }

  listSettlements(includeDeleted = false): Settlement[] {
    const out: Settlement[] = [];
    settlementsMap(this.doc).forEach((record, id) => {
      const settlement = readSettlement(id, record);
      if (!includeDeleted && settlement.deletedAt !== null) return;
      out.push(settlement);
    });
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  /**
   * Riversa nel documento una fotografia già validata: l'inversa di `snapshot()`.
   *
   * **Gli id si conservano, ed è tutto il punto.** `paidBy`, le chiavi di `split.shares`,
   * il `categoryId` di una spesa e i due membri di un pareggio sono riferimenti a id che
   * stanno dentro la fotografia stessa: rigenerarli — come farebbero `addExpense` e
   * `addMember`, che chiamano `newId` — spezzerebbe ogni collegamento e produrrebbe un
   * vault fatto di spese pagate da nessuno. Per questo non si passa dai metodi normali.
   *
   * **Non valida, e non è una svista.** La validazione sta in `parseVaultExport`, che è la
   * porta da cui i dati esterni entrano, e ripeterla qui vorrebbe dire due regole da tenere
   * allineate — la seconda delle quali, prima o poi, diversa dalla prima. Chi chiama passa
   * una `VaultSnapshot`, che è un tipo che si ottiene solo di là o da `snapshot()`.
   *
   * **Va scritta in un documento vuoto.** Su un documento che ha già dei record, gli id
   * coincidenti sovrascriverebbero e gli altri si affiancherebbero, producendo una fusione
   * che nessuno ha chiesto — e per una spesa quella fusione cambierebbe dei saldi. Chi
   * importa crea un gruppo nuovo, e `assertEmpty` lo rende impossibile da sbagliare invece
   * che da ricordare.
   *
   * Una sola transazione: la fotografia entra come **un** update Yjs, quindi come una sola
   * riga nel log e un solo blob verso il relay. Migliaia di `set` separati vorrebbero dire
   * migliaia di update, e la UI si ridisegnerebbe a metà di un vault mezzo importato.
   */
  importSnapshot(snapshot: VaultSnapshot): void {
    this.assertEmpty();

    this.transact(() => {
      for (const member of snapshot.members) {
        writeRecord(membersMap(this.doc), member.id, {
          name: member.name,
          color: member.color,
        });
      }

      for (const category of snapshot.categories) {
        writeRecord(categoriesMap(this.doc), category.id, {
          name: category.name,
          icon: category.icon,
          color: category.color,
          archived: category.archived,
        });
      }

      for (const expense of snapshot.expenses) {
        writeRecord(expensesMap(this.doc), expense.id, {
          amountCents: expense.amountCents,
          currency: expense.currency,
          date: expense.date,
          categoryId: expense.categoryId,
          note: expense.note,
          // **Non si normalizza qui**, a differenza di `addExpense`: il testo era già
          // passato per `normalizeStore` quando la spesa è stata scritta la prima volta, e
          // rifarlo su un export prodotto da una versione futura con regole diverse
          // cambierebbe dei dati durante quello che deve essere un ripristino.
          store: expense.store,
          tags: expense.tags,
          paidBy: expense.paidBy,
          split: expense.split,
          createdAt: expense.createdAt,
          updatedAt: expense.updatedAt,
          deletedAt: expense.deletedAt,
        });
      }

      for (const budget of snapshot.budgets) {
        writeRecord(budgetsMap(this.doc), budgetKey(budget.categoryId, budget.month), {
          limitCents: budget.limitCents,
        });
      }

      for (const settlement of snapshot.settlements) {
        writeRecord(settlementsMap(this.doc), settlement.id, {
          fromMember: settlement.fromMember,
          toMember: settlement.toMember,
          amountCents: settlement.amountCents,
          date: settlement.date,
          note: settlement.note,
          createdAt: settlement.createdAt,
          deletedAt: settlement.deletedAt,
        });
      }
    });
  }

  /**
   * Il documento non contiene record.
   *
   * Guarda le cinque mappe e non `meta`: il nome del gruppo viene scritto da chi crea il
   * gruppo, quindi c'è già quando l'import comincia, e non è un record che possa entrare in
   * conflitto con niente.
   */
  private assertEmpty(): void {
    const filled =
      expensesMap(this.doc).size +
      categoriesMap(this.doc).size +
      membersMap(this.doc).size +
      budgetsMap(this.doc).size +
      settlementsMap(this.doc).size;

    if (filled > 0) {
      throw new Error(
        `importSnapshot richiede un documento vuoto, e questo contiene ${filled} record. ` +
          'Un import su dati esistenti li fonderebbe, cambiando dei saldi.',
      );
    }
  }

  /**
   * Fotografia completa del vault, per l'export.
   *
   * Con `includeDeleted` include anche i tombstone: l'export JSON deve conservarli, perché
   * un file che li perde, reimportato, farebbe riapparire spese che qualcuno aveva
   * cancellato di proposito. Il CSV invece li lascia fuori.
   *
   * Categorie archiviate sempre incluse: le spese passate continuano a riferirle, e senza
   * di esse l'export mostrerebbe id grezzi al posto dei nomi.
   */
  snapshot(includeDeleted = true): VaultSnapshot {
    return {
      expenses: this.listExpenses({ includeDeleted }),
      categories: this.listCategories(true),
      members: this.listMembers(),
      budgets: this.listBudgets(),
      settlements: this.listSettlements(includeDeleted),
    };
  }
}
