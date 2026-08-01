/**
 * API applicativa sopra il documento Yjs.
 *
 * La UI non tocca mai direttamente le `Y.Map`: passa da qui, dove vivono le invarianti
 * (importi interi, quote che sommano al totale, tombstone invece di cancellazioni).
 */
import type * as Y from 'yjs';
import type { RandomSource } from '../crypto/types';
import {
  budgetsMap,
  budgetKey,
  categoriesMap,
  expensesMap,
  membersMap,
  readBudget,
  readCategory,
  readExpense,
  readMember,
  readSettlement,
  settlementsMap,
  writeRecord,
} from './doc';
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
