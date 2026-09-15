/**
 * Quando. **Una data ha sempre un marcatore.**
 *
 * Un numero senza contorno è l'importo; perché diventi una data ci vuole qualcosa che lo
 * dica — una parola del lessico, una barra, o una preposizione davanti. È l'unica ambiguità
 * che renderebbe imprevedibile tutto il resto, e la regola «il marcatore distingue» si
 * spiega in una riga a chi guarda, cosa che «vince il numero più grande» non fa.
 *
 * **Mai una data nel futuro.** «venerdì» è il venerdì appena passato, «il 3» il 3 più
 * recente: una data futura è quasi sempre una lettura sbagliata, e una spesa datata domani
 * entra nei grafici del mese senza che nessuno l'abbia chiesta.
 *
 * Un mese da solo — «agosto» — non è una data: è un periodo, e i periodi sono la domanda
 * dei Grafici, non la spesa.
 */
import { addDays, dayOfWeek } from '../insights/calendar';
import type { IsoDate } from '../model/types';
import { isFree, plainOf, type Token } from './tokens';
import type { Lexicon, ParseContext } from './types';

/** La data letta, e i token da cui viene. */
export interface DateMatch {
  date: IsoDate;
  /** Primo token, incluso. */
  from: number;
  /** Ultimo token, incluso. */
  to: number;
}

/** Quante parole può essere lunga una voce di lessico: «l'altro ieri» ne fa tre. */
const MAX_PHRASE = 3;

/**
 * La prima data della frase, o `null`.
 *
 * Si ferma alla prima: due date in una spesa sola non vogliono dire niente, e prendere
 * l'ultima sarebbe una regola da spiegare senza averne il motivo.
 */
export function findDate(
  tokens: Token[],
  taken: boolean[],
  context: ParseContext,
  lexicon: Lexicon,
): DateMatch | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!isFree(taken, i)) continue;
    const match =
      byPhrase(tokens, taken, i, context, lexicon) ??
      byWeekday(tokens, taken, i, context, lexicon) ??
      byDigits(tokens, i, context) ??
      byMonthName(tokens, taken, i, context, lexicon) ??
      byDayNumber(tokens, taken, i, context, lexicon);
    if (match !== null) return match;
  }
  return null;
}

/**
 * Questo numero fa parte di una data, quindi non è un importo?
 *
 * Vive qui e non in `amount.ts` perché è conoscenza di date: l'ordine dei riconoscitori
 * mette l'importo per primo, ma quel primo deve poter chiedere a questo che cosa sta
 * guardando. Non consulta il registro dei consumi di proposito — risponde sulla forma
 * della frase, non su chi è arrivato prima.
 */
export function looksLikeDate(tokens: Token[], index: number, lexicon: Lexicon): boolean {
  const token = tokens[index];
  if (token === undefined) return false;
  if (dayFromDigits(token, lexicon) !== null) return true;
  if (integerOf(token) === null) return false;

  const before = tokens[index - 1];
  if (before !== undefined && lexicon.dayPrefixes.includes(before.plain)) return true;

  const after = tokens[index + 1];
  return after !== undefined && monthIndexOf(after, lexicon) !== null;
}

/** «oggi», «ieri», «l'altro ieri». */
function byPhrase(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): DateMatch | null {
  const table: { words: string[]; delta: number }[] = [
    { words: lexicon.beforeYesterday, delta: -2 },
    { words: lexicon.yesterday, delta: -1 },
    { words: lexicon.today, delta: 0 },
  ];
  for (let length = MAX_PHRASE; length >= 1; length--) {
    const to = index + length - 1;
    if (!run(tokens, taken, index, to)) continue;
    const phrase = plainOf(tokens, index, to);
    for (const { words, delta } of table) {
      if (words.includes(phrase)) {
        return { date: addDays(context.today, delta), from: index, to };
      }
    }
  }
  return null;
}

/** «venerdì», «venerdì scorso»: il venerdì appena passato, oggi compreso. */
function byWeekday(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): DateMatch | null {
  const token = tokens[index];
  if (token === undefined) return null;
  const target = lexicon.weekdays.findIndex((names) => names.includes(token.plain));
  if (target < 0) return null;

  const back = (dayOfWeek(context.today) - target + 7) % 7;
  const next = tokens[index + 1];
  const to =
    next !== undefined && lexicon.past.includes(next.plain) && run(tokens, taken, index, index + 1)
      ? index + 1
      : index;
  return { date: addDays(context.today, -back), from: index, to };
}

/** `3/9`, `3/9/2026`, `2026-09-03`: tutto dentro un token solo. */
function byDigits(tokens: Token[], index: number, context: ParseContext): DateMatch | null {
  const token = tokens[index];
  if (token === undefined) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token.core);
  if (iso !== null) {
    const date = isoFrom(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    return date === null || date > context.today ? null : { date, from: index, to: index };
  }

  const slash = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(token.core);
  if (slash === null) return null;
  const day = Number(slash[1]);
  const month = Number(slash[2]);
  const written = slash[3];
  if (written === undefined) {
    const date = mostRecent(month, day, context.today);
    return date === null ? null : { date, from: index, to: index };
  }
  // Due cifre sono il secolo corrente: «26» è il 2026, non l'anno 26.
  const year = written.length === 2 ? 2000 + Number(written) : Number(written);
  const date = isoFrom(year, month, day);
  return date === null || date > context.today ? null : { date, from: index, to: index };
}

/** «3 agosto», «il 3 agosto», «3 agosto 2025». */
function byMonthName(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): DateMatch | null {
  const head = tokens[index];
  if (head === undefined) return null;
  const withPrefix = lexicon.dayPrefixes.includes(head.plain);
  const dayAt = withPrefix ? index + 1 : index;

  const dayToken = tokens[dayAt];
  if (dayToken === undefined) return null;
  const day = integerOf(dayToken);
  if (day === null || day < 1 || day > 31) return null;

  const monthToken = tokens[dayAt + 1];
  if (monthToken === undefined) return null;
  const month = monthIndexOf(monthToken, lexicon);
  if (month === null) return null;

  let to = dayAt + 1;
  const yearToken = tokens[to + 1];
  const year = yearToken === undefined ? null : integerOf(yearToken);
  let date: IsoDate | null;
  if (year !== null && year >= 1970 && year <= 9999 && run(tokens, taken, index, to + 1)) {
    to += 1;
    date = isoFrom(year, month + 1, day);
    if (date !== null && date > context.today) date = null;
  } else {
    date = mostRecent(month + 1, day, context.today);
  }

  if (date === null || !run(tokens, taken, index, to)) return null;
  return { date, from: index, to };
}

/** «il 3», «del 12»: il giorno più recente con quel numero. */
function byDayNumber(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): DateMatch | null {
  const head = tokens[index];
  if (head === undefined) return null;

  // «l'8»: la preposizione e il giorno sono attaccati, e il token è uno solo.
  const attached = dayFromDigits(head, lexicon);
  if (attached !== null) {
    const date = mostRecentDay(attached, context.today);
    return date === null ? null : { date, from: index, to: index };
  }
  if (!lexicon.dayPrefixes.includes(head.plain)) return null;

  const dayToken = tokens[index + 1];
  if (dayToken === undefined || !run(tokens, taken, index, index + 1)) return null;
  const day = integerOf(dayToken);
  if (day === null || day < 1 || day > 31) return null;
  const date = mostRecentDay(day, context.today);
  return date === null ? null : { date, from: index, to: index + 1 };
}

/** «l'8», dove la preposizione e il giorno sono attaccati. */
function dayFromDigits(token: Token, lexicon: Lexicon): number | null {
  const match = /^([a-z']+)(\d{1,2})$/.exec(token.plain);
  if (match === null) return null;
  const prefix = match[1] as string;
  if (!lexicon.dayPrefixes.includes(prefix)) return null;
  const day = Number(match[2]);
  return day >= 1 && day <= 31 ? day : null;
}

/** Il numero intero scritto in un token, o `null` se non è fatto di sole cifre. */
function integerOf(token: Token): number | null {
  return /^\d+$/.test(token.core) ? Number(token.core) : null;
}

/** Il mese, 0 = gennaio, o `null`. */
function monthIndexOf(token: Token, lexicon: Lexicon): number | null {
  const index = lexicon.months.findIndex((names) => names.includes(token.plain));
  return index < 0 ? null : index;
}

/** Tutti i token dell'intervallo esistono e sono liberi. */
function run(tokens: Token[], taken: boolean[], from: number, to: number): boolean {
  if (to >= tokens.length) return false;
  for (let i = from; i <= to; i++) {
    if (!isFree(taken, i)) return false;
  }
  return true;
}

/**
 * Il giorno/mese più recente non futuro.
 *
 * Indietreggia di un anno per volta, e non di uno solo, perché il 29 febbraio esiste una
 * volta ogni quattro: fermarsi al primo tentativo fallito vorrebbe dire non riconoscere
 * mai «29/2».
 */
function mostRecent(month: number, day: number, today: IsoDate): IsoDate | null {
  let year = Number(today.slice(0, 4));
  for (let attempts = 0; attempts < 8; attempts++) {
    const date = isoFrom(year, month, day);
    if (date !== null && date <= today) return date;
    year--;
  }
  return null;
}

/**
 * Il giorno del mese più recente non futuro.
 *
 * Anche qui si indietreggia di un mese per volta: «il 30» a marzo non è il 30 febbraio,
 * è il 30 gennaio.
 */
function mostRecentDay(day: number, today: IsoDate): IsoDate | null {
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  for (let attempts = 0; attempts < 13; attempts++) {
    const date = isoFrom(year, month, day);
    if (date !== null && date <= today) return date;
    month--;
    if (month === 0) {
      month = 12;
      year--;
    }
  }
  return null;
}

/**
 * `YYYY-MM-DD` da tre numeri, o `null` se quel giorno non esiste.
 *
 * Il controllo passa da `Date.UTC` e rilegge i componenti: il 30 febbraio scivolerebbe al
 * 2 marzo in silenzio, e una spesa datata due giorni dopo quello che si è scritto è
 * peggio di una spesa senza data. Mezzanotte UTC e componenti UTC, come `calendar.ts`:
 * un `Date` locale darebbe all'ora legale un modo di intervenire.
 */
function isoFrom(year: number, month: number, day: number): IsoDate | null {
  if (year < 1970 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1) return null;
  if (date.getUTCDate() !== day) return null;
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}
