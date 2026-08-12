import { markError } from '@/diagnostics';
import { loadNotificationsModule } from './module';
import { nextReminderAt, reminderContent } from './reminder';

/**
 * Programmare e disdire gli avvisi, per davvero.
 *
 * È la metà imperativa dello Step 31: `reminder.ts` decide **quando** e **cosa**, e ha i
 * test; qui si parla con il modulo nativo, che nei test dell'app non esiste.
 *
 * Ogni funzione è **innocua se il modulo non c'è**: la build che lo contiene è quella dello
 * Step 30, e chi non l'ha installata deve poter usare l'app senza accorgersi di nulla.
 */

/**
 * L'etichetta con cui si riconoscono le proprie notifiche.
 *
 * Serve a disdire **solo** il promemoria quando si riprogramma. `cancelAllScheduled` sarebbe
 * una riga sola e sarebbe sbagliata già dallo Step 32: cancellerebbe anche l'avviso di
 * budget di qualcun altro. Passare dai `data` invece che da un identificatore salvato in
 * `app_meta` toglie di mezzo un secondo stato da tenere allineato — e uno salvato che non
 * corrisponde più a niente (app reinstallata, notifica già scattata) lascerebbe promemoria
 * fantasma impossibili da disdire.
 */
const REMINDER_KIND = 'reminder';

/**
 * Il canale Android su cui esce il promemoria.
 *
 * Su Android 8+ una notifica **senza canale non compare**. Averne uno per motivo, e non uno
 * solo per l'app, è ciò che permette a chi vuole zittire i promemoria senza perdere gli
 * altri avvisi di farlo dalle impostazioni di sistema — che è il posto dove la gente va a
 * cercarlo, prima ancora che nella nostra schermata.
 */
const REMINDER_CHANNEL = 'promemoria';

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
