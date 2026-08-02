/**
 * I nomi degli slot dentro SecureStore.
 *
 * Separati da `keystore.ts` perché quello importa `expo-secure-store`, cioè un modulo
 * nativo: chiunque volesse solo sapere *come si chiama* uno slot si porterebbe dietro
 * React Native, e i test della logica pura non si aprirebbero nemmeno.
 */

/**
 * Slot della chiave di un gruppo: uno per vault.
 *
 * Il `vaultId` è 32 caratteri esadecimali derivati dalla chiave stessa, quindi lo slot è
 * univoco per costruzione e non richiede alcun registro per essere ricalcolato.
 */
export function groupKeyStorageKey(vaultId: string): string {
  return `jutrack.groupKey.${vaultId}`;
}

/**
 * Lo slot unico di prima dei gruppi.
 *
 * Non lo usa più nessuno: resta perché la ripartenza pulita deve poterlo **cancellare**.
 * Lasciata lì, la vecchia chiave resterebbe nel Keystore di sistema per sempre, senza
 * alcun gruppo che la riferisca.
 */
export const LEGACY_VAULT_KEY_STORAGE_KEY = 'jutrack.vaultKey';
