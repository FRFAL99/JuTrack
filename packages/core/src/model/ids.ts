import { bytesToHex } from '../crypto/encoding';
import type { RandomSource } from '../crypto/types';
import { VOCABULARY_KINDS, type VocabularyKind } from './types';

/**
 * Identificatori dei record.
 *
 * 128 bit casuali, in esadecimale. Casuali e non sequenziali perché i due dispositivi
 * creano record **senza consultarsi**: un contatore incrementale produrrebbe collisioni
 * ogni volta che entrambi registrano una spesa mentre sono offline.
 *
 * Con 128 bit la probabilità di collisione è trascurabile anche dopo milioni di record.
 */
export function newId(random: RandomSource): string {
  return bytesToHex(random.getRandomBytes(16));
}

/** Chiave composita di un budget: una categoria per un dato mese. */
export function budgetKey(categoryId: string, month: string): string {
  return `${categoryId}:${month}`;
}

/** Inversa di `budgetKey`. Restituisce `null` se la chiave è malformata. */
export function parseBudgetKey(key: string): { categoryId: string; month: string } | null {
  const separator = key.lastIndexOf(':');
  if (separator <= 0 || separator === key.length - 1) return null;
  return {
    categoryId: key.slice(0, separator),
    month: key.slice(separator + 1),
  };
}

/** Chiave composita di una voce di vocabolario: la famiglia, e la chiave del nome. */
export function vocabularyKey(kind: VocabularyKind, key: string): string {
  return `${kind}:${key}`;
}

/**
 * Inversa di `vocabularyKey`. `null` se la chiave è malformata.
 *
 * **Taglia al PRIMO `:`, e non all'ultimo come `parseBudgetKey`.** Là la parte variabile —
 * il `categoryId` — sta davanti, e il mese che la segue non può contenere due punti; qui è
 * l'opposto: la famiglia è un token fisso in testa, e a seguire c'è la chiave di un nome
 * scritto da una persona, che i due punti può contenerli benissimo («Coop: centro»). Con
 * `lastIndexOf` quel negozio diventerebbe una voce di famiglia `store:Coop` — che non è una
 * famiglia — e sparirebbe dall'elenco senza che niente lo dica.
 */
export function parseVocabularyKey(
  composite: string,
): { kind: VocabularyKind; key: string } | null {
  const separator = composite.indexOf(':');
  if (separator <= 0 || separator === composite.length - 1) return null;

  const kind = composite.slice(0, separator);
  if (!VOCABULARY_KINDS.includes(kind as VocabularyKind)) return null;

  return { kind: kind as VocabularyKind, key: composite.slice(separator + 1) };
}
