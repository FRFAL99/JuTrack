import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { markError } from '@/diagnostics';
import { ExpoSqliteDatabase, SqliteAppMeta } from '@/platform';
import { balanceView } from './BalanceWidget';
import { parseSnapshot, SNAPSHOT_KEY } from './snapshot';

/**
 * Chi risponde quando è il **sistema** a chiedere il widget.
 *
 * Le occasioni sono quelle in cui l'app non c'entra niente e quasi sempre non gira: il
 * widget appena trascinato sulla home, il telefono riacceso, il rettangolo ridimensionato.
 * Android avvia un task headless — il bundle JS senza l'app dentro — e questa funzione è
 * tutto ciò che c'è. Non ha provider, non ha il documento montato, non ha il profilo: ha il
 * foglietto in `app_meta` che `WidgetPublisher` ha lasciato, e lo disegna.
 *
 * `requestWidgetUpdate` **non passa di qui**: quando è l'app a voler aggiornare il widget si
 * porta dietro il proprio `renderWidget`, e lo fa in `publish.ts`. I due percorsi sono
 * separati apposta, e disegnano lo stesso `balanceView` da due punti diversi della stessa
 * verità su disco.
 */
export async function handleWidgetTask({
  widgetInfo,
  widgetAction,
  renderWidget,
}: WidgetTaskHandlerProps): Promise<void> {
  // Il widget è appena stato tolto dalla home: non c'è più niente da disegnare, e disegnarlo
  // lo stesso vorrebbe dire aprire il database per un rettangolo che non esiste.
  if (widgetAction === 'WIDGET_DELETED') return;

  // `MonthTotal` è dichiarato nel manifest dallo Step 30 — andava fatto lì o sarebbe servita
  // una seconda build EAS — ma il suo contenuto è lo Step 35. Chi lo aggiunge oggi trova il
  // rettangolo vuoto del launcher: è meglio di un widget che dice il saldo sotto l'etichetta
  // «speso questo mese», che sarebbe un numero giusto al posto sbagliato.
  if (widgetInfo.widgetName !== 'Balance') return;

  let balance = null;
  try {
    // **Una connessione tutta sua** (`isolated`), e non è un dettaglio: questo task può
    // partire mentre l'app è aperta e condividere con lei il runtime JS. Senza, expo-sqlite
    // riuserebbe la connessione già aperta dall'app e la `close()` qui sotto la chiuderebbe
    // sotto i piedi a chi sta registrando una spesa.
    const db = await ExpoSqliteDatabase.open('jutrack.db', { isolated: true });
    try {
      const meta = await SqliteAppMeta.open(db);
      balance = parseSnapshot(await meta.get(SNAPSHOT_KEY)).balance;
    } finally {
      // Il task muore subito dopo, ma non è detto che il processo muoia con lui: una
      // connessione lasciata aperta a ogni riavvio del telefono non si chiude più da sola.
      await db.close();
    }
  } catch (error) {
    markError('lettura del foglietto per il widget', error);
  }

  // Si disegna **sempre**, anche dopo un errore: `balance` resta `null` e il widget dice
  // «apri l'app». Uscire senza chiamare `renderWidget` lascerebbe sulla home il rettangolo
  // vuoto del launcher, che si legge come un'app rotta e non come un dato mancante.
  renderWidget(balanceView(balance));
}
