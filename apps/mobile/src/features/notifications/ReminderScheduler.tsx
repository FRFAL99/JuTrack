import { useEffect } from 'react';
import { useAppData } from '@/state';
import { readLastActivity } from './activity';
import { rescheduleReminder } from './schedule';
import { parseSettings, SETTINGS_KEY } from './settings';

/**
 * Riarma il promemoria a ogni avvio dell'app. Non disegna niente.
 *
 * **Senza questo, il promemoria scatta una volta sola.** Una notifica programmata sparisce
 * quando suona: se nessuno la rifà, chi non registra spese viene avvisato il primo giorno e
 * mai più. Le tre occasioni in cui si può riprogrammare sono l'apertura dell'app, una spesa
 * registrata e l'interruttore toccato — non c'è un processo in background che possa farlo
 * altrove, e non ce ne sarà finché lo Step 36 resta opzionale.
 *
 * **Aprire l'app non è registrare una spesa**, ed è la ragione per cui qui si rilegge
 * `readLastActivity` invece di scrivere «adesso»: se bastasse aprire l'app a spostare la
 * scadenza, il promemoria non arriverebbe mai a chi l'app la apre e basta — cioè
 * esattamente a chi voleva essere avvisato.
 *
 * Sta sotto `ProfileGate` perché legge `app_meta`, e sopra i gruppi perché non gliene
 * serve nessuno: il promemoria è del telefono, non di un vault.
 */
export function ReminderScheduler() {
  const { meta } = useAppData();

  useEffect(() => {
    let cancelled = false;

    async function rearm(): Promise<void> {
      try {
        const settings = parseSettings(await meta.get(SETTINGS_KEY));
        const last = await readLastActivity(meta);
        if (cancelled) return;
        // Anche a interruttore spento: `rescheduleReminder` disdice sempre prima di
        // riprogrammare, quindi questa chiamata ripulisce anche il promemoria rimasto in
        // programma da un'accensione il cui salvataggio non era andato a buon fine.
        await rescheduleReminder(settings.reminder, last);
      } catch {
        // Un promemoria non riarmato non è un guasto da mostrare: l'app funziona, e la
        // prossima apertura riprova.
      }
    }

    void rearm();
    return () => {
      cancelled = true;
    };
  }, [meta]);

  return null;
}
