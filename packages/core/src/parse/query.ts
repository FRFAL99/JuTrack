/**
 * `parseQuery`: una domanda scritta diventa periodo e filtri.
 *
 * **Due punti d'ingresso sopra un tokenizzatore solo**, e non una funzione con un
 * interruttore. Le parole del gruppo sono le stesse in tutte e due le frasi — `findWords` e
 * i pronomi si riusano tali e quali, e c'è il test che dà la stessa frase alle due funzioni
 * e pretende gli stessi negozi — ma **un numero vuol dire due cose opposte**: in «25 spesa
 * esselunga» è l'importo della spesa, in «spesa sopra i 25» è una soglia. Un `modo: 'spesa'
 * | 'domanda'` da passare giusto a ogni chiamata sarebbe la stessa cosa scritta peggio.
 *
 * Da qui esce **periodo e filtri**, non una `ExpenseQuery` composta: il periodo è un preset
 * che si muove col calendario, e schiacciarlo su `from`/`to` butterebbe via l'informazione
 * che il chip mostra. Li rimette insieme la schermata, come fa già oggi.
 *
 * **Un numero nudo non vuol dire niente, qui.** Nella spesa il numero senza contorno è
 * l'importo; in una domanda «50» da solo non è né una soglia né un anno né un giorno, e
 * finisce nell'avanzo. Chi vuole una soglia mette un marcatore: `sopra`, `sotto`, `fra`.
 */
import type { ExpenseQuery } from '../insights/query';
import { moneyOf } from './amount';
import { findPeriod, type QueryPeriod } from './periods';
import { mentionAt } from './people';
import { ITALIAN_LEXICON } from './lexicon';
import {
  areFree,
  isFree,
  leftover,
  newTaken,
  plainOf,
  spanOf,
  take,
  tokenize,
  type Token,
} from './tokens';
import { findWords } from './words';
import type { Lexicon, ParseContext } from './types';

/** I filtri di una domanda: una `ExpenseQuery` senza gli estremi, che li mette il periodo. */
export type QueryFilters = Omit<ExpenseQuery, 'from' | 'to'>;

/** I campi che una domanda può riempire, per evidenziare la frase. */
export type QuestionField = 'period' | 'amount' | 'category' | 'store' | 'tag' | 'person';

export interface QuestionMark {
  field: QuestionField;
  /** Primo carattere, incluso. */
  start: number;
  /** Ultimo carattere, escluso. */
  end: number;
}

/** Ciò che la domanda ha detto. Ogni campo può restare vuoto, ed è il caso normale. */
export interface ExpenseQuestion {
  /** La frase da cui viene, così com'è stata scritta. */
  text: string;
  /** `null` quando la frase non nomina nessun periodo: quello di prima non si tocca. */
  period: QueryPeriod | null;
  /** Solo le chiavi riconosciute. Le altre non si azzerano: si lasciano stare. */
  filters: QueryFilters;
  /** Tutto ciò che non è stato capito, ripulito con `tidy`. */
  note: string;
  /** In ordine di comparsa nella frase. */
  marks: QuestionMark[];
}

/** Quante parole può essere lungo un marcatore: «a carico di» ne fa tre. */
const MAX_MARKER = 3;

/**
 * Da una domanda scritta a ciò che i Grafici devono impostare.
 *
 * Non compone nessuna query e non disegna niente: restituisce il periodo e i filtri, e
 * la schermata li mette nei due `useState` che ha già.
 */
export function parseQuery(
  text: string,
  context: ParseContext,
  lexicon: Lexicon = ITALIAN_LEXICON,
): ExpenseQuestion {
  const tokens = tokenize(text);
  const taken = newTaken(tokens.length);
  const marks: QuestionMark[] = [];
  const mark = (field: QuestionField, from: number, to: number): void => {
    marks.push({ field, ...spanOf(tokens, from, to) });
  };
  const filters: QueryFilters = {};

  // **Le soglie prima del periodo**, e l'ordine conta: «sopra i 2000» ha un numero di
  // quattro cifre che il periodo leggerebbe volentieri come un anno. Un numero marcato ha
  // già detto cos'è, e chi l'ha marcato se lo prende per primo.
  const bounds = findBounds(tokens, taken, lexicon);
  for (const bound of bounds) {
    if (bound.kind === 'min') filters.minCents = bound.cents;
    else filters.maxCents = bound.cents;
    take(taken, bound.from, bound.to);
    mark('amount', bound.from, bound.to);
  }

  const period = findPeriod(tokens, taken, context, lexicon);
  if (period !== null) {
    take(taken, period.from, period.to);
    mark('period', period.from, period.to);
  }

  const person = findPerson(tokens, taken, context, lexicon);
  if (person !== null) {
    filters.memberId = person.memberId;
    filters.personMode = person.mode;
    take(taken, person.from, person.to);
    mark('person', person.from, person.to);
  }

  const words = findWords(tokens, taken, context);
  if (words.category !== null) {
    filters.categoryIds = [words.category.value];
    mark('category', absorb(tokens, taken, words.category.from, lexicon), words.category.to);
  }
  if (words.store !== null) {
    filters.stores = [words.store.value];
    mark('store', absorb(tokens, taken, words.store.from, lexicon), words.store.to);
  }
  if (words.tags.length > 0) {
    filters.tags = words.tags.map((tag) => tag.value);
    for (const tag of words.tags) {
      mark('tag', absorb(tokens, taken, tag.from, lexicon), tag.to);
    }
  }

  marks.sort((a, b) => a.start - b.start);

  return {
    text,
    period: period?.period ?? null,
    filters,
    note: leftover(tokens, taken),
    marks,
  };
}

/**
 * La domanda ha detto qualcosa?
 *
 * **È la guardia che impedisce a mezza frase di svuotare la schermata.** Si applica solo ciò
 * che è stato riconosciuto; se non è stato riconosciuto niente, non si tocca niente — perché
 * una schermata che si svuota mentre si scrive si legge come un guasto dell'app, ed è il
 * contrario di ciò a cui serve una barra dei filtri visibile.
 */
export function isEmptyQuestion(question: ExpenseQuestion): boolean {
  return question.marks.length === 0;
}

/**
 * La preposizione appiccicata davanti a una parola riconosciuta non è un avanzo.
 *
 * «spesa **da** esselunga questo mese» — la frase del criterio di «fatto» — lascerebbe un
 * «da» solitario nella nota, e una domanda capita per intero che dichiara di non aver
 * capito una parola si legge come un difetto. Si consuma solo ciò che è **davvero** una
 * parola di servizio, ed è la stessa regola del lessico: gli articoli, il «da» di «pagato
 * da», le preposizioni di tempo.
 *
 * Restituisce il nuovo inizio dell'intervallo, così anche il segno sulla frase la copre.
 */
function absorb(tokens: Token[], taken: boolean[], from: number, lexicon: Lexicon): number {
  const before = tokens[from - 1];
  if (before === undefined || !isFree(taken, from - 1)) return from;
  const service = [...lexicon.articles, ...lexicon.by, ...lexicon.inTime];
  if (!service.includes(before.plain)) return from;
  take(taken, from - 1, from - 1);
  return from - 1;
}

interface Bound {
  kind: 'min' | 'max';
  cents: number;
  from: number;
  to: number;
}

/** «sopra i 50», «sotto i 20», «fra 10 e 50». */
function findBounds(tokens: Token[], taken: boolean[], lexicon: Lexicon): Bound[] {
  const out: Bound[] = [];
  let seenMin = false;
  let seenMax = false;

  for (let i = 0; i < tokens.length; i++) {
    if (!isFree(taken, i)) continue;

    const between = markerAt(tokens, taken, i, lexicon.between);
    if (between !== null) {
      const low = numberAfter(tokens, taken, between + 1, lexicon);
      if (low !== null) {
        const linker = markerAt(tokens, taken, low.to + 1, lexicon.and);
        const high = linker === null ? null : numberAfter(tokens, taken, linker + 1, lexicon);
        if (high !== null && !seenMin && !seenMax) {
          // Raddrizzato: «fra 50 e 10» intende lo stesso intervallo di «fra 10 e 50», e
          // una soglia minima più alta della massima non filtra niente in silenzio.
          const min = Math.min(low.cents, high.cents);
          const max = Math.max(low.cents, high.cents);
          out.push({ kind: 'min', cents: min, from: i, to: high.to });
          out.push({ kind: 'max', cents: max, from: i, to: high.to });
          seenMin = true;
          seenMax = true;
          i = high.to;
          continue;
        }
      }
    }

    const above = markerAt(tokens, taken, i, lexicon.above);
    if (above !== null && !seenMin) {
      const value = numberAfter(tokens, taken, above + 1, lexicon);
      if (value !== null) {
        out.push({ kind: 'min', cents: value.cents, from: i, to: value.to });
        seenMin = true;
        i = value.to;
        continue;
      }
    }

    const below = markerAt(tokens, taken, i, lexicon.below);
    if (below !== null && !seenMax) {
      const value = numberAfter(tokens, taken, below + 1, lexicon);
      if (value !== null) {
        out.push({ kind: 'max', cents: value.cents, from: i, to: value.to });
        seenMax = true;
        i = value.to;
      }
    }
  }

  return out;
}

/**
 * L'indice dell'ultimo token di un marcatore che comincia a `index`, o `null`.
 *
 * I marcatori possono essere più parole — «più di», «a carico di» — e si provano dal più
 * lungo, così «più di» non diventa «più» con un «di» orfano.
 */
function markerAt(
  tokens: Token[],
  taken: boolean[],
  index: number,
  words: string[],
): number | null {
  for (let length = MAX_MARKER; length >= 1; length--) {
    const to = index + length - 1;
    if (to >= tokens.length || !areFree(taken, index, to)) continue;
    if (words.includes(plainOf(tokens, index, to))) return to;
  }
  return null;
}

/** La cifra subito dopo `index`, saltando un eventuale articolo: «sopra **i** 50». */
function numberAfter(
  tokens: Token[],
  taken: boolean[],
  index: number,
  lexicon: Lexicon,
): { cents: number; to: number } | null {
  let at = index;
  const article = tokens[at];
  if (article !== undefined && isFree(taken, at) && lexicon.articles.includes(article.plain)) {
    at++;
  }
  const token = tokens[at];
  if (token === undefined || !isFree(taken, at)) return null;
  const cents = moneyOf(token.plain, lexicon);
  if (cents === null) return null;

  // Il segno di valuta staccato si lascia consumare: «sopra i 50 euro» non lascia «euro».
  const next = tokens[at + 1];
  const to =
    next !== undefined && isFree(taken, at + 1) && lexicon.currency.includes(next.plain)
      ? at + 1
      : at;
  return { cents, to };
}

/** «pagate da Giulia», «a carico di Giulia». */
function findPerson(
  tokens: Token[],
  taken: boolean[],
  context: ParseContext,
  lexicon: Lexicon,
): { memberId: string; mode: 'paid' | 'owed'; from: number; to: number } | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!isFree(taken, i)) continue;

    const owed = markerAt(tokens, taken, i, lexicon.owed);
    if (owed !== null) {
      const who = mentionAt(tokens, taken, owed + 1, context, lexicon);
      if (who !== null) return { memberId: who.memberId, mode: 'owed', from: i, to: who.to };
    }

    const paid = markerAt(tokens, taken, i, lexicon.paid);
    if (paid !== null) {
      let start = paid + 1;
      const linker = tokens[start];
      if (linker !== undefined && isFree(taken, start) && lexicon.by.includes(linker.plain)) {
        start++;
      }
      const who = mentionAt(tokens, taken, start, context, lexicon);
      if (who !== null) return { memberId: who.memberId, mode: 'paid', from: i, to: who.to };
    }
  }
  return null;
}
