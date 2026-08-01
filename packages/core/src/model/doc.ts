/**
 * Struttura del documento Yjs e accessori tipati.
 *
 * Cinque `Y.Map` top-level. Ogni record è a sua volta una `Y.Map`, così due modifiche a
 * **campi diversi** dello stesso record si fondono invece di sovrascriversi: se io cambio
 * la nota mentre tu cambi la categoria, sopravvivono entrambe.
 *
 * Eccezione deliberata: `split` è memorizzato come valore unico e non come `Y.Map`
 * annidata. Vedi `readExpense` per il motivo.
 */
import * as Y from 'yjs';
import type { Budget, Category, Expense, ExpenseSplit, Member, Settlement } from './types';
import { budgetKey, parseBudgetKey } from './ids';

export const EXPENSES = 'expenses';
export const CATEGORIES = 'categories';
export const MEMBERS = 'members';
export const BUDGETS = 'budgets';
export const SETTLEMENTS = 'settlements';

export type RecordMap = Y.Map<unknown>;

export function expensesMap(doc: Y.Doc): Y.Map<RecordMap> {
  return doc.getMap<RecordMap>(EXPENSES);
}
export function categoriesMap(doc: Y.Doc): Y.Map<RecordMap> {
  return doc.getMap<RecordMap>(CATEGORIES);
}
export function membersMap(doc: Y.Doc): Y.Map<RecordMap> {
  return doc.getMap<RecordMap>(MEMBERS);
}
export function budgetsMap(doc: Y.Doc): Y.Map<RecordMap> {
  return doc.getMap<RecordMap>(BUDGETS);
}
export function settlementsMap(doc: Y.Doc): Y.Map<RecordMap> {
  return doc.getMap<RecordMap>(SETTLEMENTS);
}

/* -------------------------------------------------------------------------- */
/* Lettura                                                                     */
/* -------------------------------------------------------------------------- */

function str(map: RecordMap, key: string, fallback = ''): string {
  const value = map.get(key);
  return typeof value === 'string' ? value : fallback;
}

function num(map: RecordMap, key: string, fallback = 0): number {
  const value = map.get(key);
  return typeof value === 'number' ? value : fallback;
}

function bool(map: RecordMap, key: string, fallback = false): boolean {
  const value = map.get(key);
  return typeof value === 'boolean' ? value : fallback;
}

function nullableStr(map: RecordMap, key: string): string | null {
  const value = map.get(key);
  return typeof value === 'string' ? value : null;
}

/**
 * Legge lo split.
 *
 * `split` è memorizzato come **valore unico**, non come `Y.Map` annidata, di proposito:
 * `mode` e `shares` devono restare coerenti fra loro. Con una struttura annidata, due
 * modifiche concorrenti potrebbero fondere il `mode` di un dispositivo con le `shares`
 * dell'altro, producendo uno split che non somma al totale — un saldo sbagliato che
 * nessuno dei due utenti ha mai chiesto.
 *
 * Trattandolo come unità atomica, in caso di conflitto vince uno dei due split per intero
 * e l'invariante «le quote sommano al totale» resta comunque valida.
 */
function readSplit(map: RecordMap, fallbackPaidBy: string, amountCents: number): ExpenseSplit {
  const raw = map.get('split');
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'mode' in raw &&
    'shares' in raw &&
    typeof (raw as ExpenseSplit).shares === 'object'
  ) {
    return raw as ExpenseSplit;
  }
  // Fallback difensivo: un record proveniente da una versione futura o corrotta non deve
  // far crashare la lista spese. Si assume che l'abbia pagata e dovuta chi ha pagato.
  return { mode: 'single', shares: { [fallbackPaidBy]: amountCents } };
}

export function readExpense(id: string, map: RecordMap): Expense {
  const amountCents = num(map, 'amountCents');
  const paidBy = str(map, 'paidBy');
  return {
    id,
    amountCents,
    currency: str(map, 'currency', 'EUR'),
    date: str(map, 'date'),
    categoryId: nullableStr(map, 'categoryId'),
    note: str(map, 'note'),
    paidBy,
    split: readSplit(map, paidBy, amountCents),
    createdAt: str(map, 'createdAt'),
    updatedAt: str(map, 'updatedAt'),
    deletedAt: nullableStr(map, 'deletedAt'),
  };
}

export function readCategory(id: string, map: RecordMap): Category {
  return {
    id,
    name: str(map, 'name'),
    icon: str(map, 'icon', '📦'),
    color: str(map, 'color', '#888888'),
    archived: bool(map, 'archived'),
  };
}

export function readMember(id: string, map: RecordMap): Member {
  return {
    id,
    name: str(map, 'name'),
    color: str(map, 'color', '#888888'),
  };
}

export function readBudget(key: string, map: RecordMap): Budget | null {
  const parsed = parseBudgetKey(key);
  if (parsed === null) return null;
  return {
    categoryId: parsed.categoryId,
    month: parsed.month,
    limitCents: num(map, 'limitCents'),
  };
}

export function readSettlement(id: string, map: RecordMap): Settlement {
  return {
    id,
    fromMember: str(map, 'fromMember'),
    toMember: str(map, 'toMember'),
    amountCents: num(map, 'amountCents'),
    date: str(map, 'date'),
    note: str(map, 'note'),
    createdAt: str(map, 'createdAt'),
    deletedAt: nullableStr(map, 'deletedAt'),
  };
}

/* -------------------------------------------------------------------------- */
/* Scrittura                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Scrive i campi indicati in una `Y.Map`, creandola se non esiste.
 *
 * Scrive solo le chiavi presenti in `fields`: un aggiornamento parziale non azzera i
 * campi che non nomina.
 */
export function writeRecord(
  container: Y.Map<RecordMap>,
  id: string,
  fields: Record<string, unknown>,
): RecordMap {
  let record = container.get(id);
  if (record === undefined) {
    record = new Y.Map<unknown>();
    container.set(id, record);
  }
  for (const [key, value] of Object.entries(fields)) {
    record.set(key, value);
  }
  return record;
}

export { budgetKey };
