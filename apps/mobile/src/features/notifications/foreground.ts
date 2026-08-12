import { markError } from '@/diagnostics';
import { loadNotificationsModule } from './module';

/**
 * Cosa si vede quando la notifica arriva mentre l'app è **aperta**.
 *
 * **Senza questo file lo Step 32 non si vedrebbe affatto**, e la ragione è precisa: di
 * default `expo-notifications` non mostra nulla in primo piano, e l'avviso di budget nasce
 * proprio lì — lo produce l'app che sta guardando il documento, quindi nell'istante in cui
 * scatta l'app è per forza aperta. Programmato e mai mostrato è il peggiore dei due
 * fallimenti possibili, perché non lascia traccia.
 *
 * Il gestore è **uno per tutta l'app** e decide per tipo, non per tutti allo stesso modo:
 * un avviso di budget in primo piano ha senso — dice qualcosa che la schermata aperta non
 * mostra — mentre il promemoria dello Step 31 no, perché invita ad aprire un'app che è già
 * aperta.
 */

/**
 * Il `data.kind` decide, e quello che non si riconosce non si mostra.
 *
 * Il default prudente vale in entrambe le direzioni: una notifica senza `kind` non l'ha
 * scritta questo codice, e comportarsi come `expo-notifications` si comporterebbe senza
 * gestore è il modo di non cambiare, per sbaglio, il destino di qualcosa che arriverà in
 * futuro da un altro pezzo dell'app.
 */
export function shouldShowInForeground(kind: unknown): boolean {
  return kind === 'budget';
}

let installed = false;

/**
 * Installa il gestore, una volta sola per processo.
 *
 * Idempotente perché lo chiama un componente montato e smontato al cambio di gruppo, e
 * `setNotificationHandler` sostituisce il gestore precedente: riscriverlo non
 * romperebbe niente, ma il `if` dice che l'unicità è voluta e non un caso.
 *
 * Innocua se il modulo non c'è, come tutto il resto della cartella: la build che lo
 * contiene è quella dello Step 30.
 */
export function installForegroundHandler(): void {
  if (installed) return;
  const module = loadNotificationsModule();
  if (module === null) return;

  try {
    module.setNotificationHandler({
      handleNotification: async (notification) => {
        const show = shouldShowInForeground(notification.request.content.data?.['kind']);
        return {
          shouldShowBanner: show,
          // Banner e lista insieme: un avviso che compare e sparisce senza restare
          // nella tendina obbliga a leggerlo al volo, ed è un numero, non un saluto.
          shouldShowList: show,
          // Mai un suono in primo piano: chi ha appena toccato «Salva» sta guardando lo
          // schermo. Il suono serve a farsi notare da chi non sta guardando, e quel caso
          // qui non esiste — la notifica in primo piano è per definizione l'altro.
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
    installed = true;
  } catch (error) {
    markError('installazione del gestore delle notifiche', error);
  }
}
