/**
 * Chi, e come si divide.
 *
 * I nomi propri dei membri valgono sempre. I pronomi no: «io», «me», «mio» risolvono
 * sempre a chi scrive, ma **«te» esiste solo in un gruppo di due**. In un gruppo di due
 * «te» è l'altro senza ambiguità; in uno di quattro è chiunque, e un `paidBy` sbagliato
 * produce saldi sbagliati che si scoprono settimane dopo — la stessa ragione per cui
 * l'invariante dello split è verificata in scrittura.
 *
 * Divisione e persone stanno nello stesso file perché sono la stessa frase: «metà a te»
 * non si legge riconoscendo prima la divisione e poi la persona, ma tutto insieme. Una
 * persona nominata che non finisce né in `paidBy` né in una divisione **non si consuma**:
 * resta nella nota, dov'è innocua.
 */
import { areFree, fold, isFree, plainOf, take, type Token } from './tokens';
import type { DraftSplit, Lexicon, ParseContext } from './types';

/** Una persona nominata, e i token che la nominano. */
export interface PersonRun {
  memberId: string;
  from: number;
  to: number;
}

/** La divisione letta, e i token da cui viene. */
export interface SplitRun {
  split: DraftSplit;
  from: number;
  to: number;
}

/** Quanto può essere lungo il nome di un membro, in parole. */
const MAX_NAME = 3;

export interface PeopleMatch {
  paidBy: PersonRun | null;
  split: SplitRun | null;
}

/** Chi ha pagato e com'è divisa, per quel tanto che la frase lo dice. */
export function findPeople(
  tokens: Token[],
  taken: boolean[],
  context: ParseContext,
  lexicon: Lexicon,
): PeopleMatch {
  const paidBy = findPaidBy(tokens, taken, context, lexicon);
  if (paidBy !== null) take(taken, paidBy.from, paidBy.to);
  const split = findSplit(tokens, taken, context, lexicon);
  return { paidBy, split };
}

/** «pagato da Anna», «offro io», «Anna paga». */
function findPaidBy(
  tokens: Token[],
  taken: boolean[],
  context: ParseContext,
  lexicon: Lexicon,
): PersonRun | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined || !isFree(taken, i) || !lexicon.paid.includes(token.plain)) continue;

    // Dopo il marcatore, saltando l'eventuale «da»: «pagato da Anna».
    let start = i + 1;
    const linker = tokens[start];
    if (linker !== undefined && isFree(taken, start) && lexicon.by.includes(linker.plain)) start++;
    const after = mentionAt(tokens, taken, start, context, lexicon);
    if (after !== null) return { memberId: after.memberId, from: i, to: after.to };

    // Oppure prima: «io pago». Si guarda solo la parola attaccata, perché più in là il
    // soggetto non è più distinguibile da una parola qualunque.
    const before = mentionEndingAt(tokens, taken, i - 1, context, lexicon);
    if (before !== null) return { memberId: before.memberId, from: before.from, to: i };
  }
  return null;
}

/** «a metà», «metà a te», «tutto io». */
function findSplit(
  tokens: Token[],
  taken: boolean[],
  context: ParseContext,
  lexicon: Lexicon,
): SplitRun | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === undefined || !isFree(taken, i)) continue;

    const equal = lexicon.equalSplit.includes(token.plain);
    const whole = lexicon.wholeSplit.includes(token.plain);
    if (!equal && !whole) continue;

    let from = i;
    const before = tokens[i - 1];
    if (before !== undefined && isFree(taken, i - 1) && lexicon.toward.includes(before.plain)) {
      from = i - 1;
    }

    // Dopo la parola della divisione può esserci una persona, con o senza preposizione.
    let start = i + 1;
    const linker = tokens[start];
    if (linker !== undefined && isFree(taken, start) && lexicon.toward.includes(linker.plain)) {
      start++;
    }
    const who = mentionAt(tokens, taken, start, context, lexicon);

    if (whole) {
      // «tutto» senza una persona non vuol dire niente: meglio nella nota che inventato.
      if (who === null) continue;
      const split: DraftSplit = { mode: 'single', memberId: who.memberId };
      take(taken, from, who.to);
      return { split, from, to: who.to };
    }

    const to = who === null ? i : who.to;
    const split: DraftSplit = { mode: 'equal', memberId: null };
    take(taken, from, to);
    return { split, from, to };
  }
  return null;
}

/**
 * La persona nominata a partire da `index`, o `null`.
 *
 * I nomi si provano dal più lungo al più corto, così «Anna Maria» non diventa «Anna».
 * Non consuma niente: consumare è una decisione di chi ha trovato un ruolo per lei.
 */
export function mentionAt(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): PersonRun | null {
  for (let length = MAX_NAME; length >= 1; length--) {
    const to = index + length - 1;
    if (!areFree(taken, index, to) || to >= tokens.length) continue;
    const phrase = plainOf(tokens, index, to);
    if (phrase === '') continue;
    const member = context.members.find((candidate) => fold(candidate.name) === phrase);
    if (member !== undefined) return { memberId: member.id, from: index, to };
  }

  const token = tokens[index];
  if (token === undefined || !isFree(taken, index)) return null;

  if (lexicon.me.includes(token.plain)) {
    return { memberId: context.myMemberId, from: index, to: index };
  }
  // «te» in un gruppo di tre è chiunque: non si deduce niente, e la parola resta nella nota.
  if (lexicon.you.includes(token.plain) && context.members.length === 2) {
    const other = context.members.find((candidate) => candidate.id !== context.myMemberId);
    if (other !== undefined) return { memberId: other.id, from: index, to: index };
  }
  return null;
}

/** Come `mentionAt`, ma il nome **finisce** a `index`. */
function mentionEndingAt(
  tokens: Token[],
  taken: boolean[],
  index: number,
  context: ParseContext,
  lexicon: Lexicon,
): PersonRun | null {
  for (let length = 1; length <= MAX_NAME; length++) {
    const from = index - length + 1;
    if (from < 0) break;
    const found = mentionAt(tokens, taken, from, context, lexicon);
    if (found !== null && found.to === index) return found;
  }
  return null;
}
