/**
 * Le etichette dell'elenco dei gruppi, fuori dal componente.
 *
 * Sono due righe di testo, ma sono anche l'unica cosa che distingue a colpo d'occhio il
 * gruppo aperto dagli altri: senza, aprire il gruppo sbagliato non dà alcun segnale
 * finché non si guarda il saldo. Qui si possono provare senza montare l'interfaccia.
 */

/**
 * Il `vaultId` accorciato, come si mostra all'utente.
 *
 * Serve solo a distinguere due gruppi con lo stesso nome: sono 32 caratteri esadecimali
 * derivati dalla chiave, e per intero non li leggerebbe nessuno. Lo usano l'elenco e la
 * schermata di gestione, che devono mostrare la stessa forma.
 */
export function shortVaultId(vaultId: string): string {
  return vaultId.length <= 8 ? vaultId : `${vaultId.slice(0, 8)}…`;
}

/**
 * La riga sotto il nome, nell'elenco dei gruppi.
 *
 * `currentVaultId` è nullable perché dallo Step 21 può non esserci alcun gruppo aperto:
 * in quel caso nessuna riga dice «Aperto adesso», e va bene così.
 */
export function groupSubtitle(vaultId: string, currentVaultId: string | null): string {
  return vaultId === currentVaultId ? 'Aperto adesso' : `vault ${shortVaultId(vaultId)}`;
}
