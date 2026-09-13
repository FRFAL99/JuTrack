/**
 * Leggere la fotografia di un gruppo **senza aprirlo**.
 *
 * Il backup automatico copre tutti i gruppi del telefono, ma di runtime ne è montato uno
 * solo — quello aperto. Gli altri esistono solo come righe in SQLite, e questo modulo serve
 * a guardarci dentro.
 *
 * **Non passa da `SqliteYPersistence`, e la ragione è che quella scrive.** `load()` non si
 * limita a leggere: registra un ascoltatore sugli update e, se il log ha superato
 * `compactAfter`, accoda una **compattazione** — che cancella la tabella e la riscrive
 * (`packages/core/src/persistence/y-sqlite.ts:109-113`). Farlo su un gruppo che in quel
 * momento è anche montato dal `VaultProvider` vorrebbe dire due scrittori che compattano la
 * stessa tabella, ognuno con la propria coda. Un backup non deve poter danneggiare i dati
 * che sta salvando.
 *
 * Quindi qui si fa la cosa più noiosa possibile: si leggono le righe, si applicano a un
 * `Y.Doc` nuovo, si legge, e non si scrive **niente** da nessuna parte.
 *
 * **Il gruppo aperto si legge da SQLite come tutti gli altri**, e non dallo store montato.
 * Il prezzo è che il file può essere vecchio di qualche centinaio di millisecondi — il
 * tempo che una spesa appena registrata arrivi su disco — e il guadagno è che c'è una sola
 * strada invece di due, di cui una percorsa quasi mai e quindi mai provata.
 */
import * as Y from 'yjs';
import { VaultStore, type SqliteDatabase, type VaultSnapshot } from '@jutrack/core';
import { markError } from '@/diagnostics';
import { expoRandom } from '@/platform';
import { updatesTableName } from '@/state/groups';

export interface VaultContents {
  snapshot: VaultSnapshot;
  /** Il nome dentro il vault, che è l'autorevole. `null` se non gliene è stato dato uno. */
  groupName: string | null;
  /** Le spese vive, cancellate escluse: è la misura di ciò che si perderebbe. */
  expenseCount: number;
}

/**
 * Legge un gruppo dal suo log, senza toccarlo.
 *
 * `null` quando la tabella non c'è o non si riesce a leggerla: è il caso di un gruppo
 * registrato ma mai aperto, che sul disco non ha ancora niente. Non è un guasto — è un
 * gruppo senza dati da salvare — e chi chiama lo salta.
 */
export async function readVaultContents(
  db: SqliteDatabase,
  vaultId: string,
): Promise<VaultContents | null> {
  const table = updatesTableName(vaultId);

  try {
    const rows = await db.query<{ data: Uint8Array }>(`SELECT data FROM ${table} ORDER BY seq ASC`);
    if (rows.length === 0) return null;

    const doc = new Y.Doc();
    // Una transazione sola per tutti gli update, come fa `load()`: qui non ci sono
    // osservatori da notificare, ma il costo è lo stesso e la forma resta riconoscibile.
    doc.transact(() => {
      for (const row of rows) {
        Y.applyUpdate(doc, toBytes(row.data));
      }
    });

    const store = new VaultStore(doc, { random: expoRandom });
    const snapshot = store.snapshot();

    // `destroy()` sul documento e non sulla persistenza, che qui non esiste: libera la
    // memoria di un documento che può contenere migliaia di record, e che altrimenti
    // resterebbe agganciato finché il garbage collector non se ne accorge.
    const contents: VaultContents = {
      snapshot,
      groupName: store.getGroupName(),
      expenseCount: snapshot.expenses.filter((expense) => expense.deletedAt === null).length,
    };
    doc.destroy();
    return contents;
  } catch (error) {
    // Una tabella che non esiste è il caso normale di un gruppo mai aperto, e non merita
    // un avviso; ma distinguerla da un guasto vero costerebbe una query in più a ogni
    // gruppo. Si registra e basta: la diagnostica è un raccoglitore, non un allarme.
    markError(`lettura del gruppo ${vaultId} per il backup`, error);
    return null;
  }
}

/** Gli `Uint8Array` che tornano da SQLite non sempre lo sono già, a seconda del driver. */
function toBytes(value: Uint8Array | ArrayBuffer | number[]): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return Uint8Array.from(value);
}
