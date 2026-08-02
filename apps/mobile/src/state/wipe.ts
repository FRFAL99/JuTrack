import type { SecureKeyStore, SqliteDatabase } from '@jutrack/core';
// Import puntuali e non dal barrel `@/platform`: quello espone anche il keystore e il
// database, che importano moduli nativi. Qui è logica pura, e deve poter girare nei test
// senza trascinarsi dietro React Native — stessa regola di `state/groups.ts`.
import type { KeyValueStore } from '@/platform/app-meta';
import { SqliteSyncStore } from '@/platform/sync-store';
import type { GroupRegistry } from './groups';
import { ensureSchema } from './schema';

/**
 * Azzera questo telefono: profilo, gruppi, chiavi, spese, code di sync.
 *
 * **Locale e basta.** Le copie sul relay non vengono toccate: sono cifrate, illeggibili
 * senza la chiave, scadono da sole col TTL di trenta giorni, e cancellarle riguarda tutti
 * gli altri, non solo chi sta azzerando il proprio telefono. Chi le vuole via esce da ogni
 * gruppo con l'interruttore apposito **prima** di azzerare.
 *
 * L'ordine delle operazioni è la parte che conta, e ogni passo ha la sua ragione scritta
 * qui sotto. Il criterio che li tiene insieme è uno: **qualunque interruzione deve lasciare
 * il telefono in uno stato che l'app sa già disegnare** — profilo presente e zero gruppi,
 * cioè lo stato vuoto dello Step 21.
 *
 * Il motore va spento **prima** di chiamarla: un ciclo di sync in volo applicherebbe update
 * su una `y_updates_<id>` appena eliminata, o rimetterebbe righe nella coda dopo che la si
 * è svuotata. Se ne occupa `useWipeDevice`, che attende `phase === 'absent'`.
 */
export interface WipeDeviceDeps {
  db: SqliteDatabase;
  meta: KeyValueStore;
  keyStore: SecureKeyStore;
  registry: GroupRegistry;
}

export interface WipeOutcome {
  /** Quanti gruppi sono stati cancellati davvero. */
  groupsRemoved: number;
}

/**
 * Il nome di una tabella di persistenza, esattamente come lo scrive `updatesTableName`.
 *
 * Serve alla spazzata degli orfani: quello che arriva da `sqlite_master` finisce dentro un
 * `DROP TABLE`, dove non esistono parametri e tutto è interpolazione di testo. Una tabella
 * che porta il prefisso ma non questa forma non l'abbiamo creata noi, e non è nostra da
 * cancellare.
 */
const UPDATES_TABLE = /^y_updates_[0-9a-f]{32}$/;

export async function wipeDevice({
  db,
  meta,
  keyStore,
  registry,
}: WipeDeviceDeps): Promise<WipeOutcome> {
  // **Primissima operazione, e non è un'ottimizzazione.** Le chiavi dei gruppi stanno in
  // SecureStore sotto `groupKeyStorageKey(vaultId)`, ed `expo-secure-store` non sa elencare
  // i propri slot: l'unico modo di nominarle è leggere i `vaultId` dal registro. Cancellare
  // la tabella `groups` prima lascerebbe nel Keystore di sistema chiavi che nessuno potrà
  // più nominare, per sempre.
  const list = await registry.list();

  const failures: Error[] = [];
  let groupsRemoved = 0;

  for (const group of list) {
    try {
      // Si riusa il percorso già scritto e già testato — chiave, righe di sync, log del
      // documento, riga di registro, in quest'ordine — invece di riscrivere quel SQL qui.
      // `wipeRelay: false` è esplicito: vedi sopra, l'azzeramento è un gesto locale.
      await registry.forget(group.vaultId, { wipeRelay: false });
      groupsRemoved++;
    } catch (cause) {
      // Un gruppo che non si cancella non deve salvare gli altri: si raccoglie e si tira
      // dritto. L'errore risale comunque, dopo il giro.
      failures.push(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }

  if (failures.length > 0) {
    // Ci si ferma **prima** di toccare il profilo. Così lo stato che resta è «profilo
    // presente, N gruppi in meno», che è normale e riprovabile: rieseguendo, i gruppi
    // rimasti sono ancora in elenco e l'azzeramento si conclude.
    throw new Error(
      `Azzeramento incompleto: ${failures.length} ${failures.length === 1 ? 'gruppo non è stato cancellato' : 'gruppi non sono stati cancellati'}. ` +
        `Il profilo e quel che resta sono intatti, si può riprovare. Causa: ${failures.map((error) => error.message).join(' — ')}`,
      { cause: failures[0] },
    );
  }

  // Spazzata degli orfani, che rende l'azzeramento **riparatore**: un tentativo interrotto
  // ieri — o una `regenerate` andata a metà — si conclude oggi. Il `LIKE` va con `ESCAPE`
  // perché `_` è un jolly: senza, `y_updates_%` corrisponderebbe anche ad altro.
  const tables = await db.query<{ name: string }>(
    `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name LIKE 'y\\_updates\\_%' ESCAPE '\\'`,
  );
  for (const { name } of tables) {
    if (!UPDATES_TABLE.test(name)) continue;
    await db.execute(`DROP TABLE IF EXISTS ${name}`);
  }

  // Cursori, code di invio e state vector di ogni vault: `forget` ne ha già tolti i suoi,
  // questo prende ciò che era rimasto di gruppi usciti male.
  await SqliteSyncStore.forgetAll(db);
  await db.execute('DELETE FROM groups');

  // **Il profilo per ultimo.** All'inverso ci sarebbe una finestra con «nessun profilo» ma
  // i gruppi ancora in elenco: l'app manderebbe all'onboarding e, registrato un profilo
  // nuovo, farebbe **riapparire i gruppi di prima** — la peggior cosa che possa succedere a
  // una funzione che si chiama «azzera».
  await db.execute('DELETE FROM app_meta');

  // `DELETE FROM app_meta` porta via anche `schema_version`, e qui non si riavvia l'app:
  // nessuno lo ricalcolerebbe. `ensureSchema` è idempotente ed è già testato.
  //
  // Senza versione registrata, `ensureSchema` cerca lo schema a vault unico e lo **trova**:
  // `sync_state`, `sync_pending` e `sync_meta` portano gli stessi nomi di allora, e quindi
  // le elimina credendole vecchie. Va bene così, e non per fortuna: a questo punto sono
  // vuote — le ha appena svuotate `forgetAll` — e `SqliteSyncStore.open` le ricrea da sé
  // alla prima apertura di un gruppo. Ciò che conta è che ne esca `schema_version`
  // aggiornata, che è la ragione per cui questa riga esiste.
  await ensureSchema(db, meta, keyStore);

  return { groupsRemoved };
}
