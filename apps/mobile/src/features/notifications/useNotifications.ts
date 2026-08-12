import { useCallback, useEffect, useState } from 'react';
import { useAppData } from '@/state';
import { readLastActivity, writeLastActivity } from './activity';
import { readNotificationPermission } from './module';
import { requestNotificationPermission, rescheduleReminder } from './schedule';
import {
  DEFAULT_SETTINGS,
  parseSettings,
  serializeSettings,
  SETTINGS_KEY,
  type NotificationSettings,
} from './settings';

/** Perché l'interruttore non si è acceso. `null` quando si è acceso davvero. */
export type ReminderRefusal = 'denied' | 'blocked' | 'unavailable';

interface NotificationSettingsHandle {
  settings: NotificationSettings;
  /** Falso finché la lettura da `app_meta` non è tornata: evita che l'interruttore sfarfalli. */
  ready: boolean;
  /**
   * Il promemoria è acceso ma il sistema non ci lascia notificare.
   *
   * Succede a chi revoca il permesso dalle impostazioni di Android dopo averlo dato. Non si
   * spegne l'interruttore d'ufficio — la scelta è di chi l'ha fatta, e spegnerla di
   * nascosto la farebbe sparire senza spiegazione — ma la schermata lo dice.
   */
  blocked: boolean;
  /** `null` se è andata bene, altrimenti il motivo per cui l'interruttore è tornato giù. */
  setReminder(on: boolean): Promise<ReminderRefusal | null>;
}

/**
 * Le impostazioni degli avvisi, lette una volta e riscritte a ogni tocco.
 *
 * **Qui la scrittura non è ottimistica**, a differenza del riordino della dashboard: prima
 * si chiede il permesso al sistema, e solo se arriva si salva e si accende. Un interruttore
 * che scatta e poi torna giù è brutto; un interruttore acceso che non produce mai una
 * notifica è peggio, perché non c'è nessun modo di accorgersene se non aspettando invano.
 */
export function useNotificationSettings(): NotificationSettingsHandle {
  const { meta } = useAppData();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      let stored = DEFAULT_SETTINGS;
      try {
        stored = parseSettings(await meta.get(SETTINGS_KEY));
      } catch {
        // Una lettura fallita è indistinguibile da «mai scritto», e porta allo stesso
        // posto: tutto spento, che è il default giusto.
      }
      const permission = stored.reminder ? await readNotificationPermission() : null;
      if (cancelled) return;
      setSettings(stored);
      setBlocked(stored.reminder && permission !== 'granted');
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [meta]);

  const setReminder = useCallback(
    async (on: boolean): Promise<ReminderRefusal | null> => {
      if (on && !(await requestNotificationPermission())) {
        // Il permesso non è arrivato: non si salva niente. Distinguere «negato adesso» da
        // «non chiedibile più» serve a chi chiama per dire dove andare a rimediare.
        const permission = await readNotificationPermission();
        setBlocked(false);
        return permission === null ? 'unavailable' : 'denied';
      }

      const next: NotificationSettings = { ...settings, reminder: on };
      setSettings(next);
      setBlocked(false);
      await meta.set(SETTINGS_KEY, serializeSettings(next)).catch(() => {
        /* al riavvio si ritrova lo stato di prima: la notifica programmata resta, ma
           `ReminderScheduler` la disdice alla prima apertura, perché legge da qui. */
      });
      await rescheduleReminder(on, await readLastActivity(meta));
      return null;
    },
    [meta, settings],
  );

  return { settings, ready, blocked, setReminder };
}

/**
 * Da chiamare quando una spesa viene registrata su questo telefono.
 *
 * Sposta in avanti la scadenza del promemoria, che è tutto ciò che «registrare una spesa»
 * significa per lo Step 31. Non attende e non fallisce a vista: se la scrittura non
 * riuscisse, il promemoria arriverebbe qualche giorno prima del dovuto — un fastidio, non
 * un dato sbagliato — e non vale bloccare il ritorno alla lista spese per questo.
 */
export function useExpenseRegistered(): () => void {
  const { meta } = useAppData();

  return useCallback((): void => {
    void (async () => {
      const now = Date.now();
      await writeLastActivity(meta, now);
      const settings = parseSettings(await meta.get(SETTINGS_KEY));
      await rescheduleReminder(settings.reminder, now, now);
    })();
  }, [meta]);
}
