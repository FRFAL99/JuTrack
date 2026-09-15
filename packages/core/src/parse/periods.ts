/**
 * Il periodo di una domanda: «questo mese», «ad agosto», «l'anno scorso», «ultimi 15 giorni».
 *
 * **Si restituisce il preset quando la frase ne nomina uno, e due date quando no**, e non è
 * un dettaglio di comodo: un preset si muove col calendario e porta l'etichetta che il chip
 * mostra, mentre `from`/`to` sono un intervallo morto. «Questo mese» e «dal 1° al 15» hanno
 * gli stessi estremi il 15 del mese e restano due cose diverse; ricavare il preset
 * all'indietro dalle date vorrebbe dire indovinare quale dei due si intendeva.
 *
 * **Questo è l'unico file di `parse/` che importa `insights/period`**, e l'aggiunta al
 * vincolo del piano è deliberata: un periodo *è* aritmetica sui mesi, e riscriverla qui
 * sarebbe la quarta copia di «quanti giorni ha un mese» — esattamente il difetto che `tidy`
 * racconta di aver avuto in quattro punti. Restano fuori `query` e `breakdown`, che sono il
 * mestiere sbagliato.
 */
import { addDays } from '../insights/calendar';
import { monthBounds, monthOf, shiftMonth } from '../insights/period';
import type { IsoDate } from '../model/types';
import { isFree, plainOf, type Token } from './tokens';
import type { Lexicon, ParseContext } from './types';

/**
 * I sei preset, con gli stessi nomi che usa la schermata dei Grafici.
 *
 * Sono ripetuti qui e non importati perché `packages/core` non conosce l'app: a tenerli
 * allineati è `features/stats/filters/question.ts`, che passa un `QueryPreset` dove l'app
 * vuole un `PeriodPresetId`: il giorno in cui una delle due unioni cresce, quella riga
 * smette di compilare.
 */
export type QueryPreset =
  'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'last12Months' | 'thisYear';

/**
 * Il periodo letto da una domanda.
 *
 * O porta un preset, o porta due date: mai tutti e due, mai nessuno dei due.
 */
export interface QueryPeriod {
  preset: QueryPreset | null;
  from: IsoDate | null;
  to: IsoDate | null;
}

/** Il periodo letto, e i token da cui viene. */
export interface PeriodMatch {
  period: QueryPeriod;
  from: number;
  to: number;
}

/** Quante parole può essere lunga una frase di periodo: «il mese scorso» ne fa tre. */
const MAX_PHRASE = 3;

/** Il primo anno che ha senso chiedere. Prima non esistevano spese da registrare. */
const FIRST_YEAR = 2000;

/** Il periodo nominato dalla frase, o `null` se non ne nomina nessuno. */
export function findPeriod(
  tokens: Token[],
  taken: boolean[],
  context: ParseContext,
  lexicon: Lexicon,
): PeriodMatch | null {
  for (let i = 0; i < tokens.length; i++) {
    if (!isFree(taken, i)) continue;
    const match =
      byPreset(tokens, taken, i, lexicon) ??
      byCount(tokens, taken, i, context, lexicon) ??
      byMonthName(tokens, taken, i, context, lexicon) ??
      byYear(tokens, taken, i, context, lexicon);
    if (match !== null) return match;
  }
  return null;
}

/** «questo mese», «mese scorso», «ultimi 7 giorni»: le frasi che nominano un preset. */
function byPreset(
  tokens: Token[],
  taken: boolean[],
  index: number,
  lexicon: Lexicon,
): PeriodMatch | null {
  const table: [QueryPreset, string[]][] = [
    ['last7', lexicon.periods.last7],
    ['last30', lexicon.periods.last30],
    ['thisMonth', lexicon.periods.thisMonth],
    ['lastMonth', lexicon.periods.lastMonth],
    ['last12Months', lexicon.periods.last12Months],
    ['thisYear', lexicon.periods.thisYear],
  ];

  // Dal più lungo al più corto: «ultimi 7 giorni» deve vincere sul conteggio generico, o
  // «ultimi 7 giorni» diventerebbe un intervallo morto invece del preset che si muove.
  for (let length = MAX_PHRASE; length >= 1; length--) {
    const to = index + length - 1;
    if (!run(tokens, taken, index, to)) continue;
    const phrase = plainOf(tokens, index, to);
    for (const [preset, words] of table) {
      if (words.includes(phrase)) {
        return { period: { preset, from: null, to: null }, from: index, to };
      }
    }
  }
  return null;
}

/** «ultimi 15 giorni», «ultimi 3 mesi»: un conteggio che non è uno dei sei preset. */
function byCount(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): PeriodMatch | null {
  const head = tokens[index];
  if (head === undefined || !lexicon.lastN.includes(head.plain)) return null;
  if (!run(tokens, taken, index, index + 2)) return null;

  const count = integerOf(tokens[index + 1]);
  const unit = tokens[index + 2];
  if (count === null || count < 1 || unit === undefined) return null;

  if (lexicon.units.days.includes(unit.plain)) {
    // `count` giorni **incluso oggi**: sei indietro fanno sette, come `presetPeriod`.
    const from = addDays(context.today, -(count - 1));
    return period(from, context.today, index, index + 2);
  }
  if (lexicon.units.months.includes(unit.plain)) {
    // Il primo giorno del mese più lontano: «ultimi 3 mesi» comprende quello in corso.
    const from = `${shiftMonth(monthOf(context.today), -(count - 1))}-01`;
    return period(from, context.today, index, index + 2);
  }
  return null;
}

/** «agosto», «ad agosto»: il mese civile più recente con quel nome. */
function byMonthName(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): PeriodMatch | null {
  const head = tokens[index];
  if (head === undefined) return null;
  const withPreposition = lexicon.inTime.includes(head.plain);
  const nameAt = withPreposition ? index + 1 : index;

  const nameToken = tokens[nameAt];
  if (nameToken === undefined || !run(tokens, taken, index, nameAt)) return null;
  const month = lexicon.months.findIndex((names) => names.includes(nameToken.plain));
  if (month < 0) return null;

  // Un anno scritto dopo vale più della regola «il più recente»: «agosto 2024» è quello.
  const yearToken = tokens[nameAt + 1];
  const written = yearToken === undefined ? null : integerOf(yearToken);
  if (written !== null && written >= FIRST_YEAR && run(tokens, taken, index, nameAt + 1)) {
    const bounds = monthBounds(`${pad(written)}-${pad(month + 1, 2)}`);
    if (bounds.from > context.today) return null;
    return period(bounds.from, cap(bounds.to, context.today), index, nameAt + 1);
  }

  const year = Number(context.today.slice(0, 4));
  const thisYear = `${pad(year)}-${pad(month + 1, 2)}`;
  // Mai nel futuro: ad aprile «agosto» è quello dell'anno scorso, non quello che verrà.
  const target =
    `${thisYear}-01` <= context.today ? thisYear : `${pad(year - 1)}-${pad(month + 1, 2)}`;
  const bounds = monthBounds(target);
  return period(bounds.from, cap(bounds.to, context.today), index, nameAt);
}

/** «2025», «nel 2025», «l'anno scorso». */
function byYear(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): PeriodMatch | null {
  const head = tokens[index];
  if (head === undefined) return null;
  const thisYear = Number(context.today.slice(0, 4));

  // «l'anno scorso»: la preposizione è attaccata, quindi la frase sta in due token.
  const yearWord = tokens[index + 1];
  if (
    /^(l'|lo|il)?anno$/.test(head.plain) &&
    yearWord !== undefined &&
    lexicon.past.includes(yearWord.plain) &&
    run(tokens, taken, index, index + 1)
  ) {
    return yearPeriod(thisYear - 1, context.today, index, index + 1);
  }

  const withPreposition = lexicon.inTime.includes(head.plain);
  const digitsAt = withPreposition ? index + 1 : index;
  if (!run(tokens, taken, index, digitsAt)) return null;
  const year = integerOf(tokens[digitsAt]);
  if (year === null || year < FIRST_YEAR || year > thisYear) return null;
  return yearPeriod(year, context.today, index, digitsAt);
}

/** Un anno civile, troncato a oggi se è quello in corso. */
function yearPeriod(year: number, today: IsoDate, from: number, to: number): PeriodMatch {
  return period(`${pad(year)}-01-01`, cap(`${pad(year)}-12-31`, today), from, to);
}

function period(from: IsoDate, to: IsoDate, at: number, end: number): PeriodMatch {
  return { period: { preset: null, from, to }, from: at, to: end };
}

/**
 * Nessun periodo arriva oltre oggi.
 *
 * Non è prudenza generica: un intervallo che prosegue nel futuro fa una curva piatta fino al
 * 31, e una curva piatta non dice «non ho ancora speso», dice «non spenderò». È la stessa
 * regola di `presetPeriod` nell'app, dove i preset che arrivano a oggi si fermano a oggi.
 */
function cap(bound: IsoDate, today: IsoDate): IsoDate {
  return bound > today ? today : bound;
}

function integerOf(token: Token | undefined): number | null {
  if (token === undefined) return null;
  return /^\d+$/.test(token.core) ? Number(token.core) : null;
}

function run(tokens: Token[], taken: boolean[], from: number, to: number): boolean {
  if (to >= tokens.length) return false;
  for (let i = from; i <= to; i++) {
    if (!isFree(taken, i)) return false;
  }
  return true;
}

function pad(value: number, width = 4): string {
  return String(value).padStart(width, '0');
}
