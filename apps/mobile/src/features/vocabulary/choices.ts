import {
  knownStores,
  knownTags,
  vocabularyKeyOf,
  type Expense,
  type VocabularyEntry,
  type VocabularyKind,
} from '@jutrack/core';
import { t } from '@/i18n/translate';

/**
 * Le regole del vocabolario del gruppo, fuori dai componenti.
 *
 * Stesso motivo di `extra-fields.ts` e `split-text.ts`: sono le parti che possono essere
 * sbagliate, e i test dell'app non caricano `react-native`.
 */

/**
 * Quanto può essere lunga una voce del vocabolario.
 *
 * Della stessa famiglia di `MAX_GROUP_NAME` e `MAX_PROFILE_NAME`: senza, una voce incollata
 * da chissà dove diventa una pillola larga quanto tre schermi, e il campo `store` di ogni
 * spesa che la usa se la porta dietro nell'export e nei grafici.
 *
 * **Qui e non nei due componenti**: la scrivevano tutti e due, ognuno col suo `const`, e due
 * schermate che accettano nomi di lunghezza diversa per lo stesso elenco sono un modo lento
 * di scoprire che il limite non era un limite.
 */
export const MAX_ENTRY_NAME = 40;

/** Una voce proponibile a schermo. */
export interface Choice {
  /** La grafia da scrivere sulla pillola. */
  name: string;
  /** Chiave normalizzata: identità stabile, e `key` di lista. */
  key: string;
  /**
   * È nell'elenco del gruppo.
   *
   * `false` vuol dire «usata in qualche spesa ma mai messa in elenco»: succede su ogni
   * gruppo creato prima dello Step 59, dove il catalogo nasce vuoto mentre le spese hanno
   * già le loro parole.
   */
  inCatalog: boolean;
}

/**
 * I tag proposti a chi non ne ha ancora.
 *
 * **Sono suggerimenti da toccare, non un seme**: nulla entra nel documento finché qualcuno
 * non li sceglie. `seedDefaults` gira una volta sola al primissimo avvio, quindi un seme non
 * raggiungerebbe mai i gruppi che esistono già — e servirebbe comunque un pulsante per loro.
 * Una strada sola, che si comporta identica sui gruppi vecchi e su quelli nuovi.
 *
 * **Per i negozi non c'è nessuna lista**, e non è una dimenticanza: un tag è una parola
 * comune, un negozio è un nome proprio e locale. Spedire nel bundle dei nomi di catene
 * italiane vorrebbe dire proporre «Esselunga» a chi apre l'app in inglese. Per i negozi fa
 * tutto `missingFromCatalog`, che lavora su dati veri invece che inventati.
 */
const SUGGESTED_TAGS = [
  'mealVouchers',
  'holiday',
  'gift',
  'work',
  'refundable',
  'subscription',
  'cash',
  'health',
] as const;

export function suggestedNames(kind: VocabularyKind): string[] {
  if (kind === 'store') return [];
  return SUGGESTED_TAGS.map((key) => t(`vocabulary.suggested.${key}`));
}

/** Le voci vive dell'elenco, nell'ordine in cui sono già state ordinate dallo store. */
function catalogNames(entries: VocabularyEntry[]): string[] {
  return entries.map((entry) => entry.name);
}

/** Le parole che le spese usano, dalla più frequente. */
function usedNames(kind: VocabularyKind, expenses: Expense[]): string[] {
  return kind === 'tag' ? knownTags(expenses) : knownStores(expenses);
}

/**
 * Le voci già usate nelle spese che non stanno in elenco.
 *
 * **È ciò che impedisce che i dati esistenti diventino irraggiungibili.** Sui gruppi creati
 * prima dello Step 59 il catalogo nasce vuoto: senza questo blocco, il giorno in cui la
 * tendina sostituisce il testo libero tutti i tag già scritti resterebbero nelle spese e nei
 * grafici senza poter più essere né scelti né ritrovati, e l'elenco andrebbe ricostruito a
 * memoria.
 *
 * Il confronto è **sulla chiave**: una voce in elenco come `Vacanza` non deve ricomparire
 * qui perché una spesa vecchia la scrive `vacanza`.
 */
export function missingFromCatalog(
  kind: VocabularyKind,
  entries: VocabularyEntry[],
  expenses: Expense[],
): string[] {
  const inCatalog = new Set(entries.map((entry) => entry.key));
  return usedNames(kind, expenses).filter((name) => !inCatalog.has(vocabularyKeyOf(kind, name)));
}

/**
 * Le pillole da mostrare nel form: prima le scelte, poi l'elenco, poi le orfane.
 *
 * Le scelte stanno in cima perché sono lo **stato** della spesa che si sta scrivendo, e
 * devono restare visibili senza scorrere quando l'elenco è lungo. Sostituisce `tagChoices`,
 * che faceva la stessa cosa per i soli tag e su un vocabolario derivato invece che scelto.
 */
export function vocabularyChoices(
  kind: VocabularyKind,
  entries: VocabularyEntry[],
  chosen: string[],
  expenses: Expense[],
): Choice[] {
  const catalog = new Set(entries.map((entry) => entry.key));
  const seen = new Set<string>();
  const out: Choice[] = [];

  const push = (name: string): void => {
    const key = vocabularyKeyOf(kind, name);
    if (key === '' || seen.has(key)) return;
    seen.add(key);
    out.push({ name, key, inCatalog: catalog.has(key) });
  };

  for (const name of chosen) push(name);
  for (const name of catalogNames(entries)) push(name);
  for (const name of missingFromCatalog(kind, entries, expenses)) push(name);

  return out;
}
