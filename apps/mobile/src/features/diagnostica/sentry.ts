/**
 * Il rapporto dei guasti, acceso solo se c'e' un DSN.
 *
 * Fino allo Step 48 JuTrack era **cieca dopo la pubblicazione**: un crash sul telefono
 * di qualcun altro non lasciava traccia da nessuna parte, e l'unico segnale sarebbe
 * stata una recensione a una stella. Il Play Console mostra i crash **nativi**, ma non
 * quello che succede nel JavaScript, che in questo progetto e' quasi tutto.
 *
 * Tre scelte, e tutte e tre vengono dalla promessa che l'app fa nell'informativa.
 *
 * 1. **Niente DSN, niente Sentry.** L'inizializzazione e' condizionata: senza il
 *    valore in `extra.sentryDsn` la libreria non parte affatto. Cosi' il DSN e' una
 *    decisione di configurazione e non una riga di codice, e una build senza DSN non
 *    spedisce nulla a nessuno invece di fallire in qualche modo.
 * 2. **Le briciole si scartano per categoria** — vedi `scrub.ts`, che ha i suoi test.
 *    Rete e console non escono dal telefono.
 * 3. **Niente sessioni.** `enableAutoSessionTracking` manderebbe un evento all'apertura
 *    e alla chiusura dell'app: e' misura d'uso, cioe' esattamente la cosa che
 *    l'informativa dice di non fare. Un rapporto parte **solo quando qualcosa si
 *    rompe**.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { filtraBriciola, ripuliscEvento } from './scrub';

/** Il DSN sta in `extra` di `app.json`: e' configurazione, non un segreto — un DSN
 *  permette di **scrivere** rapporti, non di leggerli. */
function dsn(): string | undefined {
  const v = Constants.expoConfig?.extra?.['sentryDsn'];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** `true` se Sentry e' stato acceso: lo usa la sonda della diagnostica. */
export function avviaSentry(): boolean {
  const url = dsn();
  if (!url) return false;

  Sentry.init({
    dsn: url,
    // Non abbiamo un'identita' a cui collegare nulla, e non vogliamo che ne venga
    // costruita una: `sendDefaultPii` allegherebbe IP e dati del dispositivo.
    sendDefaultPii: false,
    enableAutoSessionTracking: false,
    // Nessun campione di prestazioni: e' misura d'uso, non diagnosi di guasti.
    tracesSampleRate: 0,
    beforeBreadcrumb: (b) => filtraBriciola(b),
    beforeSend: (e) => ripuliscEvento(e),
  });
  return true;
}
