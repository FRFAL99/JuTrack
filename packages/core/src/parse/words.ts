/**
 * Negozio, tag e categoria: **a vocabolario chiuso**.
 *
 * Una parola diventa un negozio solo se la sua chiave è già nel vocabolario del gruppo;
 * idem per i tag, idem per le categorie sul nome. Una parola mai vista non diventa un
 * negozio nuovo: finisce nella nota.
 *
 * Il perché è scritto in testa a `insights/naming.ts`: _«senza questo, "top negozi" diventa
 * un elenco di refusi»_. Un parser che battezza un negozio a ogni parola che non riconosce
 * farebbe quel danno **più in fretta di un umano**, in silenzio, e i grafici per negozio
 * sono la cosa che ci perde. Il prezzo è che il primo acquisto da «Esselunga» va scritto a
 * mano una volta; dopo, la frase lo conosce.
 *
 * Si propone la grafia **del vocabolario**, non quella digitata: è ciò che tiene
 * «esselunga» ed «Esselunga» un negozio solo.
 */
import { storeKey, tagKey } from '../insights/naming';
import { areFree, keyOf, take, type Token } from './tokens';
import type { ParseContext } from './types';

/** Una parola del gruppo riconosciuta, e i token da cui viene. */
export interface WordRun<T> {
  value: T;
  from: number;
  to: number;
}

export interface WordsMatch {
  store: WordRun<string> | null;
  tags: WordRun<string>[];
  /** L'id della categoria, non il nome. */
  category: WordRun<string> | null;
}

/** Quante parole può essere lungo un nome: «Mercato Centrale», «Bar dello Sport». */
const MAX_WORDS = 4;

/**
 * I negozi, i tag e la categoria che il gruppo conosce già.
 *
 * Si legge da sinistra a destra provando **prima le sequenze più lunghe**: senza questo
 * «Mercato Centrale» diventerebbe il negozio «Mercato» con «Centrale» nella nota.
 *
 * A parità di lunghezza il negozio viene prima della categoria — è l'ordine della
 * pipeline — e conta solo quando la stessa parola è tutte e due le cose, che è un caso
 * raro e che in quel caso l'utente ha creato lui.
 */
export function findWords(tokens: Token[], taken: boolean[], context: ParseContext): WordsMatch {
  const stores = new Map(context.stores.map((name) => [storeKey(name), name]));
  const tags = new Map(context.tags.map((name) => [tagKey(name), name]));
  const categories = new Map(
    context.categories
      .filter((category) => !category.archived)
      .map((category) => [storeKey(category.name), category.id]),
  );

  const match: WordsMatch = { store: null, tags: [], category: null };

  let i = 0;
  while (i < tokens.length) {
    const hit = longest(tokens, taken, i, MAX_WORDS, (key) => {
      if (match.store === null && stores.has(key)) return { kind: 'store', value: stores.get(key) };
      if (tags.has(key)) return { kind: 'tag', value: tags.get(key) };
      if (match.category === null && categories.has(key)) {
        return { kind: 'category', value: categories.get(key) };
      }
      return null;
    });

    if (hit === null) {
      i++;
      continue;
    }

    const run: WordRun<string> = { value: hit.value, from: i, to: hit.to };
    if (hit.kind === 'store') match.store = run;
    else if (hit.kind === 'category') match.category = run;
    else if (!match.tags.some((existing) => tagKey(existing.value) === tagKey(run.value))) {
      match.tags.push(run);
    }
    take(taken, i, hit.to);
    i = hit.to + 1;
  }

  return match;
}

interface Hit {
  kind: 'store' | 'tag' | 'category';
  value: string;
  to: number;
}

/** La sequenza più lunga che comincia a `index` e che `lookup` riconosce. */
function longest(
  tokens: Token[],
  taken: boolean[],
  index: number,
  maxWords: number,
  lookup: (key: string) => { kind: Hit['kind']; value: string | undefined } | null,
): Hit | null {
  for (let length = Math.min(maxWords, tokens.length - index); length >= 1; length--) {
    const to = index + length - 1;
    if (!areFree(taken, index, to)) continue;
    const key = keyOf(tokens, index, to);
    if (key === '') continue;
    const found = lookup(key);
    if (found?.value !== undefined) return { kind: found.kind, value: found.value, to };
  }
  return null;
}
