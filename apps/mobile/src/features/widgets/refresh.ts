import { AppState } from 'react-native';
import * as Y from 'yjs';
import {
  currencySymbol,
  DEFAULT_CURRENCY,
  monthBounds,
  RelayClient,
  SqliteYPersistence,
  SyncEngine,
  VaultStore,
} from '@jutrack/core';
import { RELAY_URL } from '@/config';
import { markError } from '@/diagnostics';
import { currentMonth, formatMonthTitle } from '@/features/expenses/grouping';
// Import puntuali e non dal barrel `@/state`: quello espone i provider, che tirerebbero
// dentro l'albero React intero. Qui React non c'è, e non deve esserci. Stessa regola di
// `state/wipe.ts`.
import {
  ExpoSqliteDatabase,
  expoHttp,
  expoKeyStore,
  expoRandom,
  SqliteSyncStore,
} from '@/platform';
import { SqliteAppMeta } from '@/platform/app-meta';
import { chooseCurrentGroup, CURRENT_GROUP_KEY } from '@/state/current-group';
import { GroupRegistry, updatesTableName } from '@/state/groups';
import { resolveMyMemberId } from '@/state/membership';
import { loadProfile } from '@/state/profile';
import { composeSnapshot } from './compose';
import { publishSnapshot } from './publish';
import { dueForRefresh, REFRESH_KEY } from './snapshot';

/**
 * Rifà i conti dei widget **mentre l'app non c'è**: un giro di sync col relay, e il foglietto
 * riscritto con quello che è arrivato.
 *
 * **Perché non basta ricalcolare.** Fino allo Step 35 i widget si aggiornavano solo ad app
 * aperta, e la domanda ovvia era «facciamo un ricalcolo periodico». La risposta è che non
 * servirebbe a niente: il documento locale **non cambia da solo**, perché il motore di sync
 * gira solo dentro l'app. Un ricalcolo in background darebbe gli stessi numeri di prima, con
 * l'unica eccezione del primo del mese. L'unica cosa che rende un widget di spese condivise
 * davvero vivo è **andare a vedere se l'altro telefono ha scritto qualcosa** — e per farlo si
 * deve montare il vault e parlare col relay, cioè fare in un task headless quello che
 * `VaultProvider` fa nell'albero React.
 *
 * **`start()` prima di `syncOnce()`, e il primo dei due spinge.** `start()` mette in coda il
 * delta fra il documento e l'ultima pubblicazione riuscita: se l'app era stata chiusa senza
 * rete, le spese registrate allora partono **da qui**, senza aspettare che qualcuno riapra
 * l'app. È il caso in cui questo step è più utile di quanto prometta il suo nome.
 *
 * **Non semina niente.** `VaultProvider` chiama `seedDefaults` quando monta un gruppo; qui no,
 * e la differenza è di sostanza: seminare le categorie di default è una **scrittura nel
 * documento condiviso**, e un telefono che scrive nel vault mentre nessuno lo sta usando è
 * esattamente quello che un refresh non deve fare. Qui si legge, si riceve, e si scrive solo
 * su `app_meta`, che è locale.
 *
 * Restituisce cosa è successo, perché sono tre casi diversi e chi chiama non deve dedurli da
 * un'eccezione.
 */
export type RefreshOutcome = 'refreshed' | 'skipped' | 'failed';

export async function refreshWidgetsInBackground(): Promise<RefreshOutcome> {
  // **Se l'app è davanti agli occhi, non si fa niente.** Non è prudenza generica: con l'app
  // aperta c'è già un `SyncEngine` che gira su questo stesso vault, e un secondo motore
  // significa due scritture concorrenti sulla stessa `y_updates_<id>`. Yjs regge la
  // duplicazione — gli update sono commutativi e idempotenti — ma la **compattazione** della
  // persistenza no: cancella la tabella e la riscrive, e un update inserito dall'altro
  // motore nel mezzo si perderebbe. E comunque non servirebbe: ad app aperta i widget li
  // tiene aggiornati `WidgetPublisher`.
  if (AppState.currentState === 'active') return 'skipped';

  let db: ExpoSqliteDatabase | null = null;
  let persistence: SqliteYPersistence | null = null;
  let engine: SyncEngine | null = null;

  try {
    // Connessione tutta sua, come per il disegno: il task può girare nello stesso runtime JS
    // dell'app, e la `close()` in fondo non deve chiudere il database a nessun altro.
    db = await ExpoSqliteDatabase.open('jutrack.db', { isolated: true });
    const meta = await SqliteAppMeta.open(db);

    const now = Date.now();
    if (!dueForRefresh(await meta.get(REFRESH_KEY), now)) return 'skipped';

    // Il profilo dice **chi sono io** e in che valuta leggo. Senza, non c'è un saldo «mio» da
    // calcolare: è il telefono che non ha ancora fatto l'onboarding, e non ha widget da
    // riempire.
    const profile = await loadProfile(meta);
    if (profile === null) return 'skipped';

    const registry = await GroupRegistry.open({
      db,
      keyStore: expoKeyStore,
      random: expoRandom,
      // Nessun `relay`: quello serve a `forget`, cioè a cancellare dal server. Un refresh non
      // cancella niente, e non avere il gateway rende quell'errore impossibile invece che
      // improbabile.
    });

    // La stessa domanda che si fa l'app all'avvio, con la stessa funzione: il widget deve
    // mostrare il gruppo che si troverebbe aprendo l'app, non il primo dell'elenco.
    const groups = await registry.list();
    const vaultId = chooseCurrentGroup(groups, await meta.get(CURRENT_GROUP_KEY));
    const group = groups.find((record) => record.vaultId === vaultId);
    if (group === undefined) return 'skipped';

    const keys = await registry.keys(group.vaultId);
    // Una chiave illeggibile è un guasto vero, ma non è questo il posto per raccontarlo:
    // l'app lo dice con una schermata intera. Qui i widget restano com'erano.
    if (keys === null) return 'skipped';

    const doc = new Y.Doc();
    persistence = new SqliteYPersistence(db, doc, {
      tableName: updatesTableName(group.vaultId),
    });
    await persistence.load();

    const store = new VaultStore(doc, { random: expoRandom });

    const myMemberId = resolveMyMemberId({
      store,
      origin: group.origin,
      linkedMemberId: group.myMemberId,
      profileId: profile.profileId,
    });
    // `null` vuol dire che l'app deve ancora chiedere «sei nuovo o eri già dentro?»: è una
    // domanda che si fa a una persona, non in background. Senza risposta non esiste un saldo
    // mio da mostrare, e inventarne uno sceglierebbe di nascosto la risposta che lo Step 11
    // esiste per non scegliere.
    if (myMemberId === null) return 'skipped';

    const syncStore = await SqliteSyncStore.open(db, group.vaultId);
    const client = new RelayClient(RELAY_URL, keys, expoHttp, expoRandom);
    engine = new SyncEngine(doc, client, syncStore);
    await engine.start();
    await engine.syncOnce();

    const month = currentMonth();
    const bounds = monthBounds(month);

    await publishSnapshot(
      meta,
      composeSnapshot({
        // Il nome dal registro e non da `store.getGroupName()`, che dopo il sync potrebbe già
        // essere quello nuovo: è la stessa fonte che usa `WidgetPublisher`, e due scrittori
        // che leggono lo stesso posto non si rincorrono. Ad allineare il registro al vault ci
        // pensa l'app alla prossima apertura, che è anche quando il nome nuovo comparirebbe
        // sulle schermate.
        groupName: group.name,
        expenses: store.listExpenses(),
        monthExpenses: store.listExpenses({ from: bounds.from, to: bounds.to }),
        settlements: store.listSettlements(),
        members: store.listMembers(),
        myMemberId,
        monthTitle: formatMonthTitle(month),
        symbol: currencySymbol(profile.currency ?? DEFAULT_CURRENCY),
      }),
    );

    // **In fondo e non all'inizio**: segnare l'ora prima del giro farebbe saltare il giro
    // successivo dopo un fallimento di rete, che è precisamente il momento in cui riprovare
    // ha più senso.
    await meta.set(REFRESH_KEY, String(now));
    return 'refreshed';
  } catch (error) {
    // Un refresh mancato non è un guasto da mostrare: i widget restano con i numeri di prima,
    // che erano veri quando sono stati scritti, e fra mezz'ora si riprova.
    markError('refresh dei widget in background', error);
    return 'failed';
  } finally {
    // In ordine inverso al montaggio, e ognuno per conto suo: un motore che non si ferma
    // lascerebbe un ciclo appeso in un processo che sta per morire, e una persistenza non
    // chiusa lascerebbe scritture in volo su un database che stiamo per chiudere.
    engine?.stop();
    await persistence?.destroy();
    await db?.close();
  }
}
