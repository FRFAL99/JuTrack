/**
 * `parseExpense`: la frase entra, la bozza esce.
 *
 * Sei riconoscitori in fila, ognuno dei quali **consuma** i caratteri che ha capito così il
 * successivo non li rilegge:
 *
 * | # | chi           | su «25 spesa esselunga ieri metà a te» |
 * | - | ------------- | -------------------------------------- |
 * | 1 | importo       | `25`                                   |
 * | 2 | data          | `ieri`                                 |
 * | 3 | persone       | `te`                                   |
 * | 4 | divisione     | `metà a`                               |
 * | 5 | negozio e tag | `esselunga`                            |
 * | 6 | categoria     | `spesa`                                |
 * | — | nota          | _(niente)_                             |
 *
 * L'ordine non è arbitrario. L'importo va per primo perché è l'unico che può escludere sé
 * stesso (un numero marcato come data non è un candidato, e a dirlo è `dates.ts`).
 * Persone e divisione stanno insieme e vengono prima delle parole del gruppo, così un
 * membro che si chiama come un tag resta un membro. La nota è ciò che avanza, sempre.
 *
 * Su `cena con i suoi 40` la stessa fila cattura solo l'importo e mette `cena con i suoi`
 * nella nota — che è comunque più di quanto si sarebbe scritto a mano in quel tempo. **È il
 * caso normale, non il fallimento.**
 */
import { findAmount } from './amount';
import { findDate } from './dates';
import { ITALIAN_LEXICON } from './lexicon';
import { findPeople } from './people';
import { leftover, newTaken, spanOf, take, tokenize } from './tokens';
import { findWords } from './words';
import type { DraftField, DraftMark, ExpenseDraft, Lexicon, ParseContext } from './types';

/**
 * Da una riga di testo a una spesa proposta.
 *
 * Non scrive niente, non tocca la rete, non conosce `VaultStore`: restituisce una struttura
 * in memoria che qualcuno mostrerà, e che entrerà nel documento solo passando per il form.
 * Costa qualche decina di microsecondi, quindi si può rifare a ogni tasto premuto — ma il
 * `ParseContext`, che costa una scansione delle spese, no.
 */
export function parseExpense(
  text: string,
  context: ParseContext,
  lexicon: Lexicon = ITALIAN_LEXICON,
): ExpenseDraft {
  const tokens = tokenize(text);
  const taken = newTaken(tokens.length);
  const marks: DraftMark[] = [];
  const mark = (field: DraftField, from: number, to: number): void => {
    marks.push({ field, ...spanOf(tokens, from, to) });
  };

  const amount = findAmount(tokens, taken, lexicon);
  if (amount.match !== null) {
    take(taken, amount.match.from, amount.match.to);
    mark('amount', amount.match.from, amount.match.to);
  }

  const date = findDate(tokens, taken, context, lexicon);
  if (date !== null) {
    take(taken, date.from, date.to);
    mark('date', date.from, date.to);
  }

  const people = findPeople(tokens, taken, context, lexicon);
  if (people.paidBy !== null) mark('paidBy', people.paidBy.from, people.paidBy.to);
  if (people.split !== null) mark('split', people.split.from, people.split.to);

  const words = findWords(tokens, taken, context);
  if (words.store !== null) mark('store', words.store.from, words.store.to);
  for (const tag of words.tags) mark('tag', tag.from, tag.to);
  if (words.category !== null) mark('category', words.category.from, words.category.to);

  marks.sort((a, b) => a.start - b.start);

  return {
    text,
    amountCents: amount.match?.cents ?? null,
    amountAmbiguous: amount.ambiguous,
    date: date?.date ?? null,
    categoryId: words.category?.value ?? null,
    store: words.store?.value ?? '',
    tags: words.tags.map((tag) => tag.value),
    paidBy: people.paidBy?.memberId ?? null,
    split: people.split?.split ?? null,
    note: leftover(tokens, taken),
    marks,
  };
}

/**
 * La bozza ha capito qualcosa?
 *
 * Serve a chi mostra la frase: una bozza vuota non è un errore da segnalare, è una frase
 * che non è ancora finita — e un avviso che compare alla prima lettera è un avviso che si
 * impara a ignorare.
 */
export function isEmptyDraft(draft: ExpenseDraft): boolean {
  return draft.marks.length === 0;
}
