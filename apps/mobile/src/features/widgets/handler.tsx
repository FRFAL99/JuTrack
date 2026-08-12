import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { markError } from '@/diagnostics';
import { ExpoSqliteDatabase, SqliteAppMeta } from '@/platform';
import { refreshWidgetsInBackground } from './refresh';
import { NOTHING_KNOWN, parseSnapshot, SNAPSHOT_KEY, type WidgetSnapshot } from './snapshot';
import { balanceView, monthView } from './views';

/**
 * Chi risponde quando è il **sistema** a chiedere un widget.
 *
 * Le occasioni sono quelle in cui l'app non c'entra niente e quasi sempre non gira: il
 * widget appena trascinato sulla home, il telefono riacceso, il rettangolo ridimensionato.
 * Android avvia un task headless — il bundle JS senza l'app dentro — e questa funzione è
 * tutto ciò che c'è. Non ha provider, non ha il documento montato, non ha il profilo: ha il
 * foglietto in `app_meta` che `WidgetPublisher` ha lasciato, e lo disegna.
 *
 * `requestWidgetUpdate` **non passa di qui**: quando è l'app a voler aggiornare un widget si
 * porta dietro il proprio `renderWidget`, e lo fa in `publish.ts`. I due percorsi sono
 * separati apposta, e disegnano le stesse viste da due punti diversi della stessa verità su
 * disco.
 */
export async function handleWidgetTask({
  widgetInfo,
  widgetAction,
  renderWidget,
}: WidgetTaskHandlerProps): Promise<void> {
  // Il widget è appena stato tolto dalla home: non c'è più niente da disegnare, e disegnarlo
  // lo stesso vorrebbe dire aprire il database per un rettangolo che non esiste.
  if (widgetAction === 'WIDGET_DELETED') return;

  const { widgetName } = widgetInfo;
  // Un nome che non conosciamo non si disegna: sarebbe un provider comparso nel manifest
  // senza un contenuto qui, e mostrargli il saldo vorrebbe dire un numero giusto sotto
  // l'etichetta sbagliata.
  if (widgetName !== 'Balance' && widgetName !== 'MonthTotal') return;

  // **`WIDGET_UPDATE` è la sveglia periodica, e solo lei** (Step 36). Android la manda ogni
  // `updatePeriodMillis`, e dopo un riavvio del telefono; `WIDGET_ADDED` e `WIDGET_RESIZED`
  // arrivano invece con qualcuno che sta **guardando** il rettangolo, e lì un giro di rete da
  // qualche secondo lascerebbe il widget vuoto proprio nell'istante in cui viene aggiunto.
  // Quelli si disegnano subito con ciò che c'è su disco.
  //
  // Non si attende con ansia l'esito: se il giro fallisce o viene saltato, sotto si disegna
  // comunque il foglietto di prima, che era vero quando è stato scritto.
  if (widgetAction === 'WIDGET_UPDATE') await refreshWidgetsInBackground();

  let snapshot: WidgetSnapshot = NOTHING_KNOWN;
  try {
    // **Una connessione tutta sua** (`isolated`), e non è un dettaglio: questo task può
    // partire mentre l'app è aperta e condividere con lei il runtime JS. Senza, expo-sqlite
    // riuserebbe la connessione già aperta dall'app e la `close()` qui sotto la chiuderebbe
    // sotto i piedi a chi sta registrando una spesa.
    const db = await ExpoSqliteDatabase.open('jutrack.db', { isolated: true });
    try {
      const meta = await SqliteAppMeta.open(db);
      snapshot = parseSnapshot(await meta.get(SNAPSHOT_KEY));
    } finally {
      // Il task muore subito dopo, ma non è detto che il processo muoia con lui: una
      // connessione lasciata aperta a ogni riavvio del telefono non si chiude più da sola.
      await db.close();
    }
  } catch (error) {
    markError('lettura del foglietto per i widget', error);
  }

  // Si disegna **sempre**, anche dopo un errore: il foglietto resta vuoto e il widget dice
  // «apri l'app». Uscire senza chiamare `renderWidget` lascerebbe sulla home il rettangolo
  // vuoto del launcher, che si legge come un'app rotta e non come un dato mancante.
  renderWidget(
    widgetName === 'Balance' ? balanceView(snapshot.balance) : monthView(snapshot.month),
  );
}
