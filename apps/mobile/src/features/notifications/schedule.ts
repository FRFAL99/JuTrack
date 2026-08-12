import { markError } from '@/diagnostics';
import type { AlertContent } from './content';
import { loadNotificationsModule } from './module';
import { nextReminderAt, reminderContent } from './reminder';

/**
 * Programmare e disdire gli avvisi, per davvero.
 *
 * È la metà imperativa dei tre contenuti: `reminder.ts`, `budget.ts` e `sync.ts` decidono
 * **quando** e **cosa**, e hanno i test; qui si parla con il modulo nativo, che nei test
 * dell'app non esiste.
 *
 * Ogni funzione è **innocua se il modulo non c'è**: la build che lo contiene è quella dello
 * Step 30, e chi non l'ha installata deve poter usare l'app senza accorgersi di nulla.
 */

/**
 * L'etichetta con cui si riconoscono le proprie notifiche.
 *
 * Serve a disdire **solo** il promemoria quando si riprogramma. `cancelAllScheduled` sarebbe
 * una riga sola e sarebbe sbagliata: cancellerebbe qualunque altro avviso in programma.
 * (A oggi non c'è ancora niente da proteggere, e la previsione dello Step 31 era sbagliata:
 * si aspettava che il 33 mettesse qualcosa in coda, e invece anche lui consegna sul momento.
 * La riga resta perché il primo avviso programmato che si aggiungerà non dovrà accorgersi di
 * niente.) Passare dai `data` invece che da un
 * identificatore salvato in `app_meta` toglie di mezzo un secondo stato da tenere
 * allineato — e uno salvato che non
 * corrisponde più a niente (app reinstallata, notifica già scattata) lascerebbe promemoria
 * fantasma impossibili da disdire.
 */
const REMINDER_KIND = 'reminder';

/** L'etichetta dell'avviso di budget. Lo legge anche il gestore di `foreground.ts`. */
const BUDGET_KIND = 'budget';

/** L'etichetta dell'avviso di sincronizzazione ferma (Step 33). */
const SYNC_KIND = 'sync';

/**
 * Il canale Android su cui esce il promemoria.
 *
 * Su Android 8+ una notifica **senza canale non compare**. Averne uno per motivo, e non uno
 * solo per l'app, è ciò che permette a chi vuole zittire i promemoria senza perdere gli
 * altri avvisi di farlo dalle impostazioni di sistema — che è il posto dove la gente va a
 * cercarlo, prima ancora che nella nostra schermata.
 */
const REMINDER_CHANNEL = 'promemoria';

/**
 * Il canale dell'avviso di budget, separato da quello dei promemoria.
 *
 * È la stessa ragione per cui il promemoria ne ha uno suo, applicata di nuovo: chi trova
 * insistente il promemoria delle spese deve poterlo zittire dalle impostazioni di Android
 * **senza** perdere l'avviso che sta sforando un limite. Due canali sono due interruttori
 * di sistema, e sono lì che la gente va a cercarli.
 */
const BUDGET_CHANNEL = 'budget';

/**
 * Il canale dell'avviso di sincronizzazione ferma.
 *
 * Il terzo, per la terza volta la stessa ragione: chi ha zittito i promemoria e vuole sapere
 * dei budget deve poter fare anche il contrario. Tre motivi di essere avvisati sono tre
 * interruttori nella nostra schermata **e** tre nelle impostazioni di Android, o il secondo
 * posto smentirebbe il primo.
 */
const SYNC_CHANNEL = 'sincronizzazione';

/** Disdice i promemoria già programmati, e nient'altro. */
export async function cancelReminder(): Promise<void> {
  const module = loadNotificationsModule();
  if (module === null) return;
  try {
    const scheduled = await module.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((request) => request.content.data?.['kind'] === REMINDER_KIND)
        .map((request) => module.cancelScheduledNotificationAsync(request.identifier)),
    );
  } catch (error) {
    markError('disdetta del promemoria', error);
  }
}

/**
 * Rifà il promemoria da capo: prima disdice, poi riprogramma se è acceso.
 *
 * **Disdire sempre, anche a interruttore spento**, è ciò che rende questa funzione l'unico
 * punto da chiamare: chi la usa non deve ricordarsi di ripulire il caso precedente, e
 * spegnere l'interruttore non lascia in giro una notifica già programmata che scatterebbe
 * comunque fra due giorni.
 *
 * Restituisce l'istante programmato, o `null` se non c'è niente in programma — che è anche
 * quello che succede quando il modulo nativo non è nella build.
 */
export async function rescheduleReminder(
  enabled: boolean,
  lastActivityMs: number | null,
  nowMs: number = Date.now(),
): Promise<number | null> {
  const module = loadNotificationsModule();
  if (module === null) return null;

  await cancelReminder();
  if (!enabled) return null;

  try {
    // Il canale va creato prima di programmare, e ricrearlo è innocuo: Android aggiorna
    // quello esistente e le preferenze che l'utente ci ha messo sopra restano sue.
    // `LOW` e non `DEFAULT`: compare nella barra di stato e nella tendina, ma **non
    // suona**. Un promemoria che si è chiesto non è una cosa urgente, e `MIN` sarebbe
    // l'eccesso opposto — resterebbe ripiegato in fondo alla tendina, cioè invisibile
    // proprio a chi ha acceso l'interruttore per vederlo.
    await module.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Promemoria spese',
      importance: module.AndroidImportance.LOW,
    });

    const at = nextReminderAt(lastActivityMs, nowMs);
    const content = reminderContent(lastActivityMs);
    await module.scheduleNotificationAsync({
      content: { ...content, data: { kind: REMINDER_KIND } },
      trigger: {
        type: module.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: REMINDER_CHANNEL,
      },
    });
    return at;
  } catch (error) {
    markError('programmazione del promemoria', error);
    return null;
  }
}

/**
 * Manda un avviso **adesso**, senza programmarlo.
 *
 * È la differenza di forma fra il promemoria e gli altri due, scritta in una funzione: il
 * primo è una data futura da riarmare, questi sono fatti appena accaduti. Non c'è niente da
 * disdire, e infatti non esistono né `cancelBudget` né `cancelSync`: una notifica già
 * consegnata resta nella tendina anche se l'interruttore si spegne dopo, perché quello che
 * dice era vero quando è stata scritta.
 *
 * `trigger` è un `ChannelAwareTriggerInput` — solo `channelId` — e **non `null`**: `null`
 * consegna subito ma sul canale di default, cioè fuori dagli interruttori di sistema che gli
 * Step 32 e 33 si sono presi la cura di creare.
 *
 * Il canale si crea qui a ogni invio, e ricrearlo è innocuo: Android aggiorna quello che c'è
 * già e le preferenze che l'utente ci ha messo sopra restano sue.
 *
 * Restituisce se è partita, così chi chiama può distinguere «detto» da «non c'è il
 * modulo» senza interpretare un'eccezione.
 */
async function notifyNow(
  kind: string,
  channel: { id: string; name: string },
  content: AlertContent,
  failure: string,
): Promise<boolean> {
  const module = loadNotificationsModule();
  if (module === null) return false;

  try {
    // `DEFAULT` e non `LOW` come il promemoria: quello è un invito che ci si è chiesti,
    // questi sono fatti appena cambiati su cui si può ancora agire. Un avviso di soldi o di
    // spese che non arrivano, se non si fa notare, arriva quando non serve più.
    await module.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: module.AndroidImportance.DEFAULT,
    });

    await module.scheduleNotificationAsync({
      content: { ...content, data: { kind } },
      trigger: { channelId: channel.id },
    });
    return true;
  } catch (error) {
    markError(failure, error);
    return false;
  }
}

/** L'avviso che una categoria ha toccato o superato il limite del mese (Step 32). */
export async function notifyBudget(content: AlertContent): Promise<boolean> {
  return notifyNow(
    BUDGET_KIND,
    { id: BUDGET_CHANNEL, name: 'Budget del mese' },
    content,
    'invio dell’avviso di budget',
  );
}

/** L'avviso che le spese non stanno arrivando agli altri telefoni (Step 33). */
export async function notifySync(content: AlertContent): Promise<boolean> {
  return notifyNow(
    SYNC_KIND,
    { id: SYNC_CHANNEL, name: 'Sincronizzazione' },
    content,
    'invio dell’avviso di sincronizzazione',
  );
}

/**
 * Chiede il permesso di notificare, e dice com'è andata.
 *
 * Si chiama **solo** accendendo un interruttore, mai al boot: su Android 13 il dialogo di
 * sistema si può rifiutare una volta sola, e sprecarlo all'avvio — quando nessuno ha ancora
 * chiesto di essere avvisato di niente — vuol dire non poterlo più chiedere quando servirà.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const module = loadNotificationsModule();
  if (module === null) return false;
  try {
    const current = await module.getPermissionsAsync();
    if (current.granted) return true;
    // `canAskAgain` falso significa che il sistema non mostrerà più il dialogo: rifarlo
    // non darebbe errore, semplicemente non succederebbe niente, e l'interruttore
    // resterebbe spento senza spiegazione. Chi chiama distingue i due casi dal messaggio.
    if (current.canAskAgain === false) return false;
    return (await module.requestPermissionsAsync()).granted;
  } catch (error) {
    markError('richiesta del permesso di notificare', error);
    return false;
  }
}
