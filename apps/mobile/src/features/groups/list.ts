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
 * I colori del quadratino di un gruppo.
 *
 * Una terza famiglia, distinta da quella delle persone e da quella delle categorie, perché
 * nell'header delle spese le tre cose compaiono insieme: il gruppo nella pill, il membro
 * negli avatar, la categoria nelle righe. Se il quadratino del gruppo pescasse dai colori
 * dei profili, la pill sembrerebbe una persona.
 */
const GROUP_COLORS = ['#4C6EF5', '#12B886', '#F76707', '#AE3EC9', '#1098AD', '#E64980'] as const;

/**
 * Il colore di un gruppo, derivato dal suo `vaultId`.
 *
 * **Non è un campo dello schema, ed è la ragione per cui esiste questa funzione.** Il
 * documento Yjs è sincronizzato: aggiungere un colore al gruppo vorrebbe dire un update per
 * ogni gruppo su ogni telefono, e una domanda in più a chi ne crea uno. Il `vaultId` è già
 * lì, è stabile per la vita del gruppo e uguale su tutti i dispositivi — quindi lo stesso
 * gruppo ha lo stesso colore su entrambi i telefoni, gratis.
 *
 * **Il colore non porta mai l'identità da solo:** nel quadratino c'è sempre l'iniziale del
 * nome, e accanto il nome per intero. Vale la stessa regola dei grafici.
 */
export function groupColor(vaultId: string): string {
  // I `vaultId` sono 32 esadecimali derivati dalla chiave: la prima cifra è già ben
  // distribuita, e un hash vero non aggiungerebbe nulla su sei classi.
  const seed = Number.parseInt(vaultId.slice(0, 2), 16);
  const index = Number.isNaN(seed) ? 0 : seed % GROUP_COLORS.length;
  return GROUP_COLORS[index] ?? GROUP_COLORS[0];
}

/** Quel poco che si sa di un gruppo **aperto**: viene dal suo documento, quindi solo del suo. */
export interface GroupStats {
  expenseCount: number;
  /** Totale del mese in corso, già formattato: la formattazione del denaro sta nel core. */
  monthTotal: string;
}

/**
 * La riga sotto il nome, nell'elenco dei gruppi.
 *
 * `currentVaultId` è nullable perché dallo Step 21 può non esserci alcun gruppo aperto:
 * in quel caso nessuna riga dice «Aperto adesso», e va bene così.
 *
 * **`stats` vale solo per il gruppo corrente, e il documento di redesign chiedeva di più.**
 * Il mockup mostra `Aperto adesso · 2 spese · 119,00 € questo mese` su **ogni** riga, ma
 * spese e totali stanno dentro il documento Yjs di quel gruppo, e di documenti ne è montato
 * **uno solo per volta** — è la scelta architetturale che il progetto ha fatto dall'inizio
 * e che lo Step 12 ha confermato. Per riempire quella riga su tutte le altre bisognerebbe
 * aprire ogni vault: N runtime, N chiavi tirate dal portachiavi, e il motore di sync da
 * decidere quale gruppo segue. Le altre righe restano quindi col `vault <short>`, che è
 * comunque ciò che distingue due gruppi con lo stesso nome.
 */
export function groupSubtitle(
  vaultId: string,
  currentVaultId: string | null,
  stats?: GroupStats,
): string {
  if (vaultId !== currentVaultId) return `vault ${shortVaultId(vaultId)}`;
  if (stats === undefined) return 'Aperto adesso';

  const count =
    stats.expenseCount === 0
      ? 'nessuna spesa'
      : `${stats.expenseCount} ${stats.expenseCount === 1 ? 'spesa' : 'spese'}`;
  return `Aperto adesso · ${count} · ${stats.monthTotal} questo mese`;
}
