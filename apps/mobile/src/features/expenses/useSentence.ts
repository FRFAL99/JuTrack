import { useMemo } from 'react';
import type { ParseContext } from '@jutrack/core';
import { useCategories, useExpenses, useMembers, useMyMemberId, useVocabulary } from '@/state';
import { todayIso } from './grouping';
import { sentenceContext } from './sentence';

/**
 * Il contesto della grammatica, preso dal gruppo aperto.
 *
 * **Sta in un hook a parte perché lo chiedono in due:** il foglio, che rilegge la frase a
 * ogni tasto, e la schermata della spesa, che la rilegge una volta dopo la navigazione
 * (decisione 8 del piano — viaggia la frase, non la bozza). Costruirlo due volte, ognuno a
 * modo suo, vorrebbe dire due vocabolari che possono divergere: la stessa parola
 * riconosciuta nell'anteprima e non più nel form.
 *
 * **Il `useMemo` non dipende dalla frase, e non è un'ottimizzazione facoltativa.**
 * `sentenceContext` passa da `knownStores`, che scandisce **tutte** le spese del gruppo:
 * ricostruirlo nel corpo del componente lo farebbe girare a ogni tasto premuto, e su un
 * gruppo con qualche migliaio di spese la scrittura diventerebbe a scatti mentre tutto
 * sembra funzionare. È lo stesso difetto che `insights/query.ts` descrive per i grafici.
 */
export function useSentenceContext(): ParseContext {
  const members = useMembers();
  const myMemberId = useMyMemberId();
  const categories = useCategories();
  const storeEntries = useVocabulary('store');
  const tagEntries = useVocabulary('tag');
  const expenses = useExpenses();

  return useMemo(
    () =>
      sentenceContext({
        today: todayIso(),
        members,
        myMemberId,
        categories,
        storeEntries,
        tagEntries,
        expenses,
      }),
    [members, myMemberId, categories, storeEntries, tagEntries, expenses],
  );
}
