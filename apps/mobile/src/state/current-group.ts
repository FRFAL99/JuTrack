import type { GroupRecord } from './groups';

/**
 * Quale gruppo aprire, e quale aprire dopo esserne usciti.
 *
 * Due funzioni di poche righe, estratte da `GroupsProvider` perché sono l'unica parte di
 * quello step che si possa provare senza montare React Native — e perché sono il punto in
 * cui un errore **cancella dati di qualcuno**: sbagliare la scelta su una lista non vuota
 * significa aprire il gruppo sbagliato, o nessuno, a chi le spese ce le ha già dentro.
 *
 * Dallo Step 21 entrambe possono rispondere `null`: al primo avvio non esiste più alcun
 * gruppo, e uscire dall'ultimo non ne fa più nascere uno vuoto al suo posto.
 */

/**
 * Il gruppo da aprire all'avvio.
 *
 * `stored` è quello ricordato dall'ultima volta. Se non c'è più — abbandonato, oppure il
 * database azzerato dalla ripartenza pulita — si apre il primo della lista invece di
 * restare senza gruppo corrente: quel caso è la regressione del gruppo abbandonato, che
 * lasciava l'app ferma sul caricamento fino al riavvio.
 *
 * **Con la lista piena il comportamento è identico a prima dello Step 21**, `stored`
 * assente compreso: è la garanzia per chi ha già «Le mie spese» con dentro delle spese, e
 * non deve accorgersi di nulla. Il solo caso nuovo è la lista vuota.
 */
export function chooseCurrentGroup(list: GroupRecord[], stored: string | null): string | null {
  return (list.find((group) => group.vaultId === stored) ?? list[0])?.vaultId ?? null;
}

/**
 * Il gruppo da aprire dopo essere usciti da `leftVaultId`, oppure `null` se non ne resta
 * nessuno.
 *
 * `list` è la lista **dopo** la cancellazione, ma il filtro sul gruppo appena lasciato
 * resta lo stesso: rende la funzione indifferente all'ordine in cui il chiamante rilegge
 * il registro, e quell'ordine è esattamente il genere di dettaglio che cambia in un
 * refactoring senza che nessun test se ne accorga.
 */
export function nextAfterLeave(list: GroupRecord[], leftVaultId: string): string | null {
  return list.find((group) => group.vaultId !== leftVaultId)?.vaultId ?? null;
}
