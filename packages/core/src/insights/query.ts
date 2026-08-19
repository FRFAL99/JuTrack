/**
 * La domanda che si fa ai grafici, e l'importo che ne risulta.
 *
 * Un `ExpenseQuery` raccoglie i sei filtri in un oggetto solo, così tutti i grafici di una
 * schermata rispondono alla **stessa** domanda: passarli uno per uno a ciascun widget
 * sarebbe il modo più rapido per averne uno che ne ignora uno.
 *
 * Il filtro non sta in `ExpenseFilter` di `VaultStore` (che resta `from`/`to`/`categoryId`)
 * di proposito: `listExpenses` è una scansione lineare che alloca un array nuovo a ogni
 * chiamata, e chiamarla una volta per widget vorrebbe dire scandire N volte la stessa
 * lista. Si filtra **una volta** con `applyQuery`, e le aggregazioni ricevono il risultato.
 */
import type { Cents } from '../model/money';
import { formatMoney } from '../model/money';
import type { Expense, IsoDate } from '../model/types';
import { storeKey, tagKey } from './naming';

/**
 * Cosa vuol dire «le spese di una persona».
 *
 * - `owed` — **a carico di**: la sua quota, cioè quanto quella spesa le è costata. È il
 *   default perché è ciò che una persona intende dicendo «le mie spese».
 * - `paid` — **ha pagato**: le spese che ha materialmente anticipato, per intero.
 */
export type PersonMode = 'owed' | 'paid';

export interface ExpenseQuery {
  /** Inclusivo. */
  from?: IsoDate;
  /** Inclusivo. */
  to?: IsoDate;
  /** In OR fra loro: nessuna categoria indicata significa tutte. */
  categoryIds?: string[];
  /** Confrontati sulla chiave normalizzata, non sulla grafia. */
  stores?: string[];
  tags?: string[];
  memberId?: string;
  /** Default: `owed`. Conta solo se c'è un `memberId`. */
  personMode?: PersonMode;
  /** Estremi inclusivi, sull'importo **proiettato** — vedi `amountFor`. */
  minCents?: Cents;
  maxCents?: Cents;
}

/**
 * L'importo di una spesa **secondo la domanda che si sta facendo**.
 *
 * È il punto in cui tutto questo può produrre numeri plausibili e sbagliati, e per questo è
 * una funzione sola: `paidBy` e `split.shares` sono cose diverse, e filtrando per una
 * persona una cena da 40 € divisa a metà, mostrare 40 € sarebbe **falso**.
 *
 * - Senza filtro persona: l'importo pieno.
 * - Con `owed`: la **quota** di quella persona.
 * - Con `paid`: l'importo **pieno**, perché la domanda è quanto ha anticipato. Mostrare la
 *   sua quota sotto un filtro che dice «ha pagato» contraddirebbe l'etichetta: la cena da
 *   40 € che ha pagato lei è 40 €, non 20.
 *
 * Nessun grafico legge `amountCents` per conto suo.
 */
export function amountFor(expense: Expense, query: ExpenseQuery = {}): Cents {
  if (query.memberId === undefined) return expense.amountCents;
  if ((query.personMode ?? 'owed') === 'paid') {
    return expense.paidBy === query.memberId ? expense.amountCents : 0;
  }
  return expense.split.shares[query.memberId] ?? 0;
}

/**
 * Le spese che soddisfano la domanda, in **AND** fra i filtri e senza le cancellate.
 *
 * Da chiamare una volta per schermata: le aggregazioni ricevono questo risultato insieme
 * alla query, perché l'importo dipende da entrambi.
 */
export function applyQuery(expenses: Expense[], query: ExpenseQuery = {}): Expense[] {
  const categories = query.categoryIds;
  const stores = query.stores?.map(storeKey);
  const tags = query.tags?.map(tagKey);

  return expenses.filter((expense) => {
    if (expense.deletedAt !== null) return false;
    if (query.from !== undefined && expense.date < query.from) return false;
    if (query.to !== undefined && expense.date > query.to) return false;

    if (categories !== undefined && categories.length > 0) {
      if (expense.categoryId === null || !categories.includes(expense.categoryId)) return false;
    }

    if (stores !== undefined && stores.length > 0) {
      if (!stores.includes(storeKey(expense.store))) return false;
    }

    if (tags !== undefined && tags.length > 0) {
      const own = expense.tags.map(tagKey);
      // In OR: una spesa etichettata «casa» entra in una domanda su «casa o regalo».
      if (!own.some((tag) => tags.includes(tag))) return false;
    }

    if (query.memberId !== undefined && !involves(expense, query)) return false;

    // La fascia si misura sull'importo **proiettato**, non su quello pieno: un istogramma
    // costruito su `amountFor` mostrerebbe altrimenti barre fuori dalla fascia scelta.
    const amount = amountFor(expense, query);
    if (query.minCents !== undefined && amount < query.minCents) return false;
    if (query.maxCents !== undefined && amount > query.maxCents) return false;

    return true;
  });
}

/** Il totale della domanda: la somma degli importi proiettati. È il numero in testa. */
export function queryTotalCents(expenses: Expense[], query: ExpenseQuery = {}): Cents {
  return expenses.reduce((sum, expense) => sum + amountFor(expense, query), 0);
}

/** Vero se la query ha almeno un filtro attivo. */
export function isEmptyQuery(query: ExpenseQuery): boolean {
  return queryParts(query, {}).length === 0;
}

/**
 * I nomi che solo l'app conosce.
 *
 * `packages/core` ha gli id, non i nomi: le categorie e i membri stanno nel documento, e il
 * periodo ha un'etichetta che la sceglie il selettore («Agosto», «Ultimi 30 giorni»). Il
 * core decide **quali** filtri nominare e **come** si leggono; chi chiama fornisce le
 * parole che gli mancano.
 */
export interface QueryLabels {
  period?: string;
  category?: (id: string) => string;
  member?: (id: string) => string;
}

/**
 * Le frasi che compongono `queryParts`, nella lingua di chi guarda.
 *
 * Stessa regola dello Step 39 per `NumberFormat`: `packages/core` non importa `i18next`, per
 * la regola dello Step 0 che tiene fuori anche `react-native`. Il testo arriva da fuori come
 * parametro, con un default italiano che tiene validi i test del core scritti prima di
 * questo step; `apps/mobile` passa la versione tradotta dal dizionario, con un modulo sottile
 * come già per `formatMoney` (Step 39, `@/i18n/money`).
 */
export interface QueryStrings {
  categoriesCount: (count: number) => string;
  storesCount: (count: number) => string;
  tagsCount: (count: number) => string;
  owedBy: (who: string) => string;
  paidBy: (who: string) => string;
  amountFrom: (amount: string) => string;
  amountTo: (amount: string) => string;
  allExpenses: string;
  /** Ripiego di `describePeriod`, usato solo se chi chiama non passa `labels.period`. */
  periodFrom: (date: string) => string;
  periodTo: (date: string) => string;
}

/** Il testo di chi non ne passa uno: italiano, come il resto del core. */
export const ITALIAN_QUERY_STRINGS: QueryStrings = {
  categoriesCount: (count) => `${count} categorie`,
  storesCount: (count) => `${count} negozi`,
  tagsCount: (count) => `${count} tag`,
  owedBy: (who) => `A carico di ${who}`,
  paidBy: (who) => `Pagate da ${who}`,
  amountFrom: (amount) => `Da ${amount}`,
  amountTo: (amount) => `Fino a ${amount}`,
  allExpenses: 'Tutte le spese',
  periodFrom: (date) => `Dal ${date}`,
  periodTo: (date) => `Fino al ${date}`,
};

/**
 * Una frase per filtro attivo, nell'ordine in cui la barra dei chip le mostra.
 *
 * `symbol` è l'unico pezzo di formattazione monetaria che entra qui: le fasce di importo si
 * leggono come importi, e con la valuta scelta nel profilo (Step 29). Default `'€'`, così i
 * chiamanti che non ne hanno una restano identici.
 */
export function queryParts(
  query: ExpenseQuery,
  labels: QueryLabels = {},
  symbol = '€',
  strings: QueryStrings = ITALIAN_QUERY_STRINGS,
): string[] {
  const parts: string[] = [];

  if (query.from !== undefined || query.to !== undefined) {
    parts.push(labels.period ?? describePeriod(query.from, query.to, strings));
  }

  const categories = query.categoryIds ?? [];
  if (categories.length === 1) {
    parts.push(name(categories[0] as string, labels.category));
  } else if (categories.length > 1) {
    parts.push(strings.categoriesCount(categories.length));
  }

  const stores = query.stores ?? [];
  if (stores.length === 1) parts.push(stores[0] as string);
  else if (stores.length > 1) parts.push(strings.storesCount(stores.length));

  const tags = query.tags ?? [];
  if (tags.length === 1) parts.push(`#${tags[0] as string}`);
  else if (tags.length > 1) parts.push(strings.tagsCount(tags.length));

  if (query.memberId !== undefined) {
    const who = name(query.memberId, labels.member);
    parts.push((query.personMode ?? 'owed') === 'paid' ? strings.paidBy(who) : strings.owedBy(who));
  }

  const { minCents, maxCents } = query;
  if (minCents !== undefined && maxCents !== undefined) {
    parts.push(`${formatMoney(minCents, symbol)} – ${formatMoney(maxCents, symbol)}`);
  } else if (minCents !== undefined) {
    parts.push(strings.amountFrom(formatMoney(minCents, symbol)));
  } else if (maxCents !== undefined) {
    parts.push(strings.amountTo(formatMoney(maxCents, symbol)));
  }

  return parts;
}

/** Le stesse frasi in una riga sola, per un sottotitolo. «Tutte le spese» se non filtra. */
export function describeQuery(
  query: ExpenseQuery,
  labels: QueryLabels = {},
  symbol = '€',
  strings: QueryStrings = ITALIAN_QUERY_STRINGS,
): string {
  const parts = queryParts(query, labels, symbol, strings);
  return parts.length === 0 ? strings.allExpenses : parts.join(' · ');
}

/** Se la persona c'entra con questa spesa, secondo la modalità scelta. */
function involves(expense: Expense, query: ExpenseQuery): boolean {
  const memberId = query.memberId as string;
  if ((query.personMode ?? 'owed') === 'paid') return expense.paidBy === memberId;
  // Una quota a zero non è partecipazione: la spesa non le è costata nulla.
  return (expense.split.shares[memberId] ?? 0) !== 0;
}

function name(id: string, resolve: ((id: string) => string) | undefined): string {
  return resolve === undefined ? id : resolve(id);
}

/** Ripiego quando il chiamante non passa un'etichetta di periodo: le date grezze. */
function describePeriod(
  from: IsoDate | undefined,
  to: IsoDate | undefined,
  strings: QueryStrings,
): string {
  if (from !== undefined && to !== undefined) return `${from} → ${to}`;
  return from !== undefined ? strings.periodFrom(from) : strings.periodTo(to as IsoDate);
}
