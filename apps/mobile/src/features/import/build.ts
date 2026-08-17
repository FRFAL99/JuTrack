import * as Y from 'yjs';
import { VaultStore, type RandomSource, type VaultSnapshot } from '@jutrack/core';

/**
 * Da fotografia a stato Yjs, senza montare niente.
 *
 * **Perché non si passa dal runtime del vault.** Di documenti Yjs ne è montato uno solo per
 * volta, quello del gruppo aperto: per importare dentro un gruppo nuovo bisognerebbe
 * crearlo, aprirlo, aspettare che il `VaultProvider` lo monti e solo allora scrivere — una
 * catena asincrona che attraversa tre provider, con in mezzo una finestra in cui esiste un
 * gruppo vuoto che l'utente può già vedere e toccare. Qui invece il documento si costruisce
 * in memoria, si serializza, e il gruppo nasce **già pieno**: `GroupRegistry.createFromState`
 * scrive lo stato nel log prima che qualcuno possa aprirlo.
 *
 * È lo stesso meccanismo con cui `regenerate` sposta un gruppo su una chiave nuova, e non è
 * un caso: sono la stessa operazione — un vault nuovo che nasce con dei dati dentro.
 *
 * `random` serve al `VaultStore` per costruirsi, non per generare id: `importSnapshot`
 * conserva quelli del file, ed è tutto il punto di quel metodo.
 */
export function encodeSnapshotAsState(snapshot: VaultSnapshot, random: RandomSource): Uint8Array {
  const doc = new Y.Doc();
  new VaultStore(doc, { random }).importSnapshot(snapshot);
  return Y.encodeStateAsUpdate(doc);
}
