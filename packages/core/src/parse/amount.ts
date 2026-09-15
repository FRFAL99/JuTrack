/**
 * Quanto. **Un numero nudo è l'importo.**
 *
 * La regola è una sola e si spiega in una riga: il numero senza contorno è la cifra della
 * spesa. Chi vuole scrivere una data mette un marcatore — è `dates.ts` a dire quali — e
 * quel numero smette di essere un candidato.
 *
 * Se restano **due** numeri nudi e nessuno dei due porta un segno di valuta, l'importo non
 * si compila e basta. Non si tira a indovinare, perché l'imprevedibilità è peggio
 * dell'assenza: chi non si fida di ciò che compare smette di usarlo, e sotto c'è il
 * tastierino di sempre.
 */
import { parseAmount, type Cents } from '../model/money';
import { looksLikeDate } from './dates';
import { isFree, type Token } from './tokens';
import type { Lexicon } from './types';

/** L'importo letto, e i token da cui viene — il segno di valuta compreso. */
export interface AmountMatch {
  cents: Cents;
  from: number;
  to: number;
}

/** L'esito della lettura: una cifra, oppure il perché non c'è. */
export interface AmountResult {
  match: AmountMatch | null;
  /** Due numeri nudi, nessuno marcato: si è scelto di non scegliere. */
  ambiguous: boolean;
}

/** Un numero come si scrive in Italia: `25`, `12,50`, `1.234,56`. */
const NUMBER = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$|^\d+(?:[.,]\d{1,2})?$/;

interface Candidate {
  cents: Cents;
  from: number;
  to: number;
  /** Porta un segno di valuta: attaccato, o nel token accanto. */
  marked: boolean;
}

/** La cifra della frase, se ce n'è una sola da poter dire. */
export function findAmount(tokens: Token[], taken: boolean[], lexicon: Lexicon): AmountResult {
  const candidates: Candidate[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (!isFree(taken, i)) continue;
    const candidate = readNumber(tokens, taken, i, lexicon);
    if (candidate !== null) candidates.push(candidate);
  }

  // Un segno di valuta è una dichiarazione: «questo è l'importo». Vince sui numeri nudi,
  // e li rende irrilevanti invece di renderli ambigui.
  const marked = candidates.filter((candidate) => candidate.marked);
  const pool = marked.length > 0 ? marked : candidates;

  if (pool.length === 0) return { match: null, ambiguous: false };
  if (pool.length > 1) return { match: null, ambiguous: true };

  const only = pool[0] as Candidate;
  return { match: { cents: only.cents, from: only.from, to: only.to }, ambiguous: false };
}

/**
 * Una cifra di denaro scritta in un token, o `null`.
 *
 * **La usa anche `query.ts`**, ed è l'unico pezzo di lettura dei numeri che le due funzioni
 * condividono: in «25 spesa esselunga» il numero è l'importo, in «spesa sopra i 25» è una
 * soglia — lo stesso numero, due campi opposti — ma *come si legge* «12,50» è una cosa sola.
 * Duplicarla vorrebbe dire due regole sul punto delle migliaia che possono divergere.
 */
export function moneyOf(plain: string, lexicon: Lexicon): Cents | null {
  const attached = stripCurrency(plain, lexicon);
  if (!NUMBER.test(attached.digits)) return null;
  const cents = parseAmount(decimalPoint(attached.digits));
  // Zero non è una spesa, e un importo negativo non esiste in questo modello: meglio
  // lasciarli alla nota che fabbricare un numero che il form rifiuterebbe.
  return cents === null || cents <= 0 ? null : cents;
}

/** Il numero che comincia a `index`, col suo eventuale segno di valuta. */
function readNumber(
  tokens: Token[],
  taken: boolean[],
  index: number,
  lexicon: Lexicon,
): Candidate | null {
  const token = tokens[index];
  if (token === undefined) return null;
  if (looksLikeDate(tokens, index, lexicon)) return null;

  const cents = moneyOf(token.plain, lexicon);
  if (cents === null) return null;
  const attached = stripCurrency(token.plain, lexicon);

  let from = index;
  let to = index;
  let marked = attached.marked;

  const before = tokens[index - 1];
  if (
    !marked &&
    before !== undefined &&
    isFree(taken, index - 1) &&
    isCurrency(before.plain, lexicon)
  ) {
    from = index - 1;
    marked = true;
  }
  const after = tokens[index + 1];
  if (
    !marked &&
    after !== undefined &&
    isFree(taken, index + 1) &&
    isCurrency(after.plain, lexicon)
  ) {
    to = index + 1;
    marked = true;
  }

  return { cents, from, to, marked };
}

/** `25€` e `€25` sono `25` marcato; tutto il resto passa com'è. */
function stripCurrency(plain: string, lexicon: Lexicon): { digits: string; marked: boolean } {
  for (const symbol of lexicon.currency) {
    if (plain.length > symbol.length && plain.endsWith(symbol)) {
      return { digits: plain.slice(0, -symbol.length), marked: true };
    }
    if (plain.length > symbol.length && plain.startsWith(symbol)) {
      return { digits: plain.slice(symbol.length), marked: true };
    }
  }
  return { digits: plain, marked: false };
}

function isCurrency(plain: string, lexicon: Lexicon): boolean {
  return lexicon.currency.includes(plain);
}

/**
 * Da come si scrive un numero in Italia a come lo legge `parseAmount`.
 *
 * Il punto delicato è che **il punto fa due mestieri**: in `1.234,56` separa le migliaia,
 * in `25.50` i centesimi. Toglierlo sempre trasformerebbe venticinque euro e mezzo in
 * duemilacinquecentocinquanta, che è il genere di errore che non si nota finché non è
 * salvato. Si toglie solo quando c'è un gruppo di tre cifre dietro.
 */
function decimalPoint(digits: string): string {
  const grouped = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(digits);
  return (grouped ? digits.replace(/\./g, '') : digits).replace(',', '.');
}
