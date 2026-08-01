import { bytesToHex } from '../crypto/encoding';
import type { RandomSource } from '../crypto/types';

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
