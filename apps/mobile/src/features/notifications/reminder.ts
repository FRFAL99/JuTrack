/**
 * Quando cade il promemoria, e cosa dice.
 *
 * **Il problema che questo file risolve.** Una notifica locale si **programma prima** e
 * scatta da sola: nessuno la rilegge al momento in cui suona, e non c'è un processo in
 * background che possa decidere lì per lì se ha ancora senso — quello sarebbe lo Step 36,
 * dichiarato opzionale e fuori dall'MVP. Quindi «avvisami se non registro una spesa da tre
 * giorni» non si può scrivere come una condizione da valutare: va scritto come **una data
 * di scadenza**, calcolata adesso e riprogrammata ogni volta che succede qualcosa che
 * l'app vede — l'apertura, una spesa registrata, l'interruttore toccato.
 *
 * Ne segue che il testo dell'avviso è **vero per costruzione**: se una spesa fosse stata
 * registrata nel frattempo, quella notifica sarebbe stata cancellata e rifatta.
 */

/** Dopo quanti giorni senza registrare nulla arriva il promemoria. */
export const REMINDER_DAYS = 3;

/**
 * A che ora del giorno, in ora locale.
 *
 * Le venti: dopo cena, quando gli scontrini della giornata sono in tasca e c'è un momento
 * per guardarli. Un promemoria di spese alle nove del mattino arriva mentre si è in
 * mezzo ad altro, e la sera è anche l'ora in cui la giornata di spese è finita.
 */
export const REMINDER_HOUR = 20;

/**
 * L'istante in cui programmare il prossimo promemoria.
 *
 * `lastActivityMs` è quando questo telefono ha registrato una spesa l'ultima volta, o
 * `null` se non l'ha mai fatto — nel qual caso il conto parte da adesso, cioè da quando si
 * è acceso l'interruttore: dire «non registri una spesa da tre giorni» a chi ha appena
 * installato l'app sarebbe falso.
 *
 * **Se la scadenza è già passata**, il promemoria va alla prossima occorrenza dell'ora
 * scelta invece che nel passato: `scheduleNotificationAsync` con una data passata non
 * aspetta, e il caso è tutt'altro che raro — basta non aprire l'app per una settimana.
 *
 * **Si lavora in ora locale**, ed è l'unico posto del progetto in cui è la scelta giusta:
 * `calendar.ts` nel core sta in UTC perché confronta giorni di calendario fra due telefoni,
 * qui invece «le venti» vuol dire le venti dove si trova chi legge. L'aritmetica passa dai
 * componenti del `Date` e non da una somma di millisecondi, così l'ora legale non sposta il
 * promemoria di un'ora due volte l'anno.
 */
export function nextReminderAt(lastActivityMs: number | null, nowMs: number): number {
  const base = new Date(lastActivityMs ?? nowMs);
  const due = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + REMINDER_DAYS,
    REMINDER_HOUR,
  );
  if (due.getTime() > nowMs) return due.getTime();

  const now = new Date(nowMs);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REMINDER_HOUR);
  if (today.getTime() > nowMs) return today.getTime();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, REMINDER_HOUR).getTime();
}

export interface ReminderContent {
  title: string;
  body: string;
}

/**
 * Cosa c'è scritto nella tendina delle notifiche.
 *
 * Due testi e non uno: chi non ha **mai** registrato una spesa non ha smesso di farlo, e
 * «non registri una spesa da 3 giorni» a chi ha installato l'app ieri sarebbe la solita
 * frase falsa accanto a un numero. Nessuno dei due dà la colpa a nessuno — è un promemoria
 * che si è chiesto, non un richiamo.
 */
export function reminderContent(lastActivityMs: number | null): ReminderContent {
  if (lastActivityMs === null) {
    return {
      title: 'La prima spesa',
      body: 'Hai acceso il promemoria ma non hai ancora registrato niente. Bastano dieci secondi.',
    };
  }
  return {
    title: 'Spese da registrare?',
    body: `Non registri una spesa da ${REMINDER_DAYS} giorni. Se ne hai fatte, è il momento buono.`,
  };
}
