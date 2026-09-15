import { markError } from '@/diagnostics';
import type { KeyValueStore } from '@/platform/app-meta';
import { loadWidgetModule, type WidgetName } from './module';
import { widgetSize } from './size';
import {
  changedWidgets,
  NOTHING_KNOWN,
  parseSnapshot,
  serializeSnapshot,
  SNAPSHOT_KEY,
  type WidgetSnapshot,
} from './snapshot';
// `import type`: cancellato in compilazione, quindi descrive le viste senza caricare la
// libreria nativa che quel file importa. Stessa forma di `module.ts`.
import type * as Views from './views';

/**
 * Il lato imperativo dei widget: scrivere il foglietto e ridisegnare la home.
 *
 * Stessa divisione di `notifications/schedule.ts` rispetto a `reminder.ts` e compagni:
 * `snapshot.ts` decide **cosa** dire e ha i test; qui si parla con il modulo nativo, che nei
 * test dell'app non esiste. Ogni funzione è **innocua se il modulo non c'è**, e su iOS non
 * c'è per costruzione.
 */

/**
 * Scrive il foglietto, e ridisegna **solo i widget che hanno qualcosa di nuovo**.
 *
 * Il documento cambia a ogni spesa; i due numeri mostrati cambiano in momenti diversi e più di
 * rado — una spesa che pago io e tengo per me sposta il totale del mese e non il saldo, un
 * pareggio sposta il saldo e non il totale. Senza questo confronto ogni modifica costerebbe
 * una scrittura su `app_meta` e **due** giri di `RemoteViews` verso il launcher, che è il modo
 * in cui un widget diventa una voce nella classifica dei consumi.
 *
 * **Prima si scrive, poi si disegna**, come per i tre avvisi: nell'ordine inverso, un disegno
 * riuscito seguito da una scrittura fallita lascerebbe sulla home un numero che nessun riavvio
 * del telefono saprebbe più ricostruire — perché a ricostruirlo, dopo, è il foglietto.
 *
 * Restituisce quali widget sono stati ridisegnati, così chi chiama non deve dedurlo.
 */
export async function publishSnapshot(
  meta: KeyValueStore,
  next: WidgetSnapshot,
): Promise<WidgetName[]> {
  const current = parseSnapshot(await meta.get(SNAPSHOT_KEY));
  const changed = changedWidgets(current, next);
  if (changed.length === 0) return [];

  await meta.set(SNAPSHOT_KEY, serializeSnapshot(next));
  await draw(next, changed);
  return changed;
}

/**
 * Riporta i widget a «non lo so», dopo «Azzera questo telefono».
 *
 * Serve perché l'azzeramento cancella `app_meta` — il foglietto compreso — ma **nessuno
 * ridisegna la home**: senza questa chiamata i numeri dell'ultimo gruppo resterebbero scritti
 * sullo schermo di un telefono che di quel gruppo non sa più niente, finché qualcuno non
 * riavvia. Lo Step 22 ha stabilito che azzerare azzera davvero, e la home fa parte di ciò
 * che si vede.
 */
export async function clearWidgets(): Promise<void> {
  await draw(NOTHING_KNOWN, ['Balance', 'MonthTotal']);
}

/**
 * Disegna i widget indicati, senza rileggere il disco.
 *
 * Il modulo e le viste si caricano **qui dentro** e non in cima al file: `views.tsx` importa
 * la libreria per davvero, e un import in cima verrebbe eseguito al boot su qualunque telefono
 * — compresi quelli con una build in cui quel modulo nativo non c'è. È la stessa ragione, e la
 * stessa forma, di `features/notifications/module.ts`.
 *
 * Non passa dal task headless: `requestWidgetUpdate` si porta dietro il proprio `renderWidget`.
 * I due percorsi sono separati e disegnano le stesse viste. `widgetNotFound` non fa niente di
 * proposito — nessun widget sulla home è il caso normale, non un guasto.
 *
 * **`renderWidget` riceve `WidgetInfo`, e da questo step lo usa.** Fino allo Step 70 la vista
 * si calcolava una volta prima del giro e la funzione ignorava l'argomento: andava benissimo
 * finché il rettangolo era lo stesso a ogni dimensione. Adesso non lo è più, e quella riga
 * sarebbe diventata un guasto che **nessun test può vedere** — qui il modulo nativo non
 * esiste — e che nemmeno il ridimensionamento mostrerebbe, perché quel gesto passa
 * dall'**altro** percorso, `handler.tsx`. Si vedrebbe soltanto così: widget largo sulla home,
 * si registra una spesa, e il rettangolo si ridisegna nella versione stretta, con l'app in
 * mano — cioè nel momento esatto in cui lo si sta guardando.
 *
 * I due giri sono **in fila e non in parallelo**: sono due chiamate al processo del launcher,
 * e un `Promise.all` guadagnerebbe qualche millisecondo su un aggiornamento che nessuno sta
 * guardando, al prezzo di un errore su uno dei due che porta via anche l'altro.
 */
async function draw(snapshot: WidgetSnapshot, names: readonly WidgetName[]): Promise<void> {
  const module = loadWidgetModule();
  if (module === null) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { balanceView, monthView } = require('./views') as typeof Views;

    for (const widgetName of names) {
      await module.requestWidgetUpdate({
        widgetName,
        renderWidget: (info) =>
          widgetName === 'Balance'
            ? balanceView(snapshot.balance, widgetSize(info))
            : monthView(snapshot.month, widgetSize(info)),
        widgetNotFound: () => {},
      });
    }
  } catch (error) {
    markError('aggiornamento dei widget', error);
  }
}
