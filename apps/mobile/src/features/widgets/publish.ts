import { markError } from '@/diagnostics';
import type { KeyValueStore } from '@/platform/app-meta';
// `import type`: cancellato in compilazione, quindi descrive la vista senza caricare la
// libreria nativa che quel file importa. Stessa forma di `module.ts`.
import type * as BalanceWidget from './BalanceWidget';
import { loadWidgetModule } from './module';
import {
  parseSnapshot,
  sameSnapshot,
  serializeSnapshot,
  SNAPSHOT_KEY,
  type WidgetSnapshot,
} from './snapshot';

/**
 * Il lato imperativo dei widget: scrivere il foglietto e ridisegnare la home.
 *
 * Stessa divisione di `notifications/schedule.ts` rispetto a `reminder.ts` e compagni:
 * `snapshot.ts` decide **cosa** dire e ha i test; qui si parla con il modulo nativo, che nei
 * test dell'app non esiste. Ogni funzione è **innocua se il modulo non c'è**, e su iOS non
 * c'è per costruzione.
 */

/**
 * Scrive il foglietto, e ridisegna **solo se è cambiato qualcosa**.
 *
 * Il documento cambia a ogni spesa; il saldo mostrato molto più di rado — una spesa che pago
 * io e dividiamo a metà lo sposta, una che pago per me solo no. Senza questo confronto ogni
 * modifica del documento costerebbe una scrittura su `app_meta` e un giro di `RemoteViews`
 * verso il launcher, che è il modo in cui un widget diventa una voce nella classifica dei
 * consumi.
 *
 * **Prima si scrive, poi si disegna**, come per i tre avvisi: nell'ordine inverso, un disegno
 * riuscito seguito da una scrittura fallita lascerebbe sulla home un numero che nessun
 * riavvio del telefono saprebbe più ricostruire — perché a ricostruirlo, dopo, è il foglietto.
 *
 * Restituisce se c'era davvero qualcosa di nuovo, così chi chiama non deve dedurlo.
 */
export async function publishSnapshot(meta: KeyValueStore, next: WidgetSnapshot): Promise<boolean> {
  const current = parseSnapshot(await meta.get(SNAPSHOT_KEY));
  if (sameSnapshot(current, next)) return false;

  await meta.set(SNAPSHOT_KEY, serializeSnapshot(next));
  await draw(next);
  return true;
}

/**
 * Riporta i widget a «non lo so», dopo «Azzera questo telefono».
 *
 * Serve perché l'azzeramento cancella `app_meta` — il foglietto compreso — ma **nessuno
 * ridisegna la home**: senza questa chiamata il saldo dell'ultimo gruppo resterebbe scritto
 * sullo schermo di un telefono che di quel gruppo non sa più niente, finché qualcuno non
 * riavvia. Lo Step 22 ha stabilito che azzerare azzera davvero, e la home fa parte di ciò
 * che si vede.
 */
export async function clearWidgets(): Promise<void> {
  await draw({ balance: null });
}

/**
 * Disegna il foglietto che gli si passa, senza rileggere il disco.
 *
 * Il modulo e la vista si caricano **qui dentro** e non in cima al file:
 * `BalanceWidget.tsx` importa la libreria per davvero, e un import in cima verrebbe eseguito
 * al boot su qualunque telefono — compresi quelli con una build in cui quel modulo nativo
 * non c'è. È la stessa ragione, e la stessa forma, di `features/notifications/module.ts`.
 *
 * Non passa dal task headless: `requestWidgetUpdate` si porta dietro il proprio
 * `renderWidget`. I due percorsi sono separati e disegnano lo stesso `balanceView`.
 * `widgetNotFound` non fa niente di proposito — nessun widget sulla home è il caso normale,
 * non un guasto.
 */
async function draw(snapshot: WidgetSnapshot): Promise<void> {
  const module = loadWidgetModule();
  if (module === null) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { balanceView } = require('./BalanceWidget') as typeof BalanceWidget;
    await module.requestWidgetUpdate({
      widgetName: 'Balance',
      renderWidget: () => balanceView(snapshot.balance),
      widgetNotFound: () => {},
    });
  } catch (error) {
    markError('aggiornamento del widget del saldo', error);
  }
}
