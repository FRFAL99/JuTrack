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
export type NotificationRefusal = 'denied' | 'blocked' | 'unavailable';

/** Quale avviso: le chiavi di `NotificationSettings`, non una seconda lista da allineare. */
export type NotificationKind = keyof NotificationSettings;

interface NotificationSettingsHandle {
  settings: NotificationSettings;
  /** Falso finché la lettura da `app_meta` non è tornata: evita che l'interruttore sfarfalli. */
  ready: boolean;
  /**
   * Almeno un avviso è acceso ma il sistema non ci lascia notificare.
   *
   * Succede a chi revoca il permesso dalle impostazioni di Android dopo averlo dato. Non si
   * spegne l'interruttore d'ufficio — la scelta è di chi l'ha fatta, e spegnerla di
   * nascosto la farebbe sparire senza spiegazione — ma la schermata lo dice.
   *
   * **Uno solo per tutta la sezione**, e non uno per riga: il permesso di notificare è uno
   * per l'app, quindi ripetere la stessa frase accanto a ogni interruttore acceso direbbe
   * tre volte la stessa cosa e farebbe sembrare che i rimedi siano tre.
   */
  blocked: boolean;
  /** `null` se è andata bene, altrimenti il motivo per cui l'interruttore è tornato giù. */
  set(kind: NotificationKind, on: boolean): Promise<NotificationRefusal | null>;
}

/** Se c'è almeno un avviso acceso, il permesso serve davvero. */
function anyEnabled(settings: NotificationSettings): boolean {
  return Object.values(settings).some((on) => on);
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
      const permission = anyEnabled(stored) ? await readNotificationPermission() : null;
      if (cancelled) return;
      setSettings(stored);
      setBlocked(anyEnabled(stored) && permission !== 'granted');
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [meta]);

  const set = useCallback(
    async (kind: NotificationKind, on: boolean): Promise<NotificationRefusal | null> => {
      if (on && !(await requestNotificationPermission())) {
        // Il permesso non è arrivato: non si salva niente. Distinguere «negato adesso» da
        // «non chiedibile più» serve a chi chiama per dire dove andare a rimediare.
        const permission = await readNotificationPermission();
        setBlocked(false);
        return permission === null ? 'unavailable' : 'denied';
      }

      const next: NotificationSettings = { ...settings, [kind]: on };
      setSettings(next);
      setBlocked(false);
      await meta.set(SETTINGS_KEY, serializeSettings(next)).catch(() => {
        /* al riavvio si ritrova lo stato di prima: la notifica programmata resta, ma
           `ReminderScheduler` la disdice alla prima apertura, perché legge da qui. */
      });
      // Solo il promemoria ha qualcosa da riprogrammare: l'avviso di budget non vive in
      // coda, lo produce `BudgetWatcher` guardando il documento. Spegnerlo non lascia
      // niente da disdire, e accenderlo non ha niente da recuperare — i segni in
      // `app_meta` sono stati tenuti aggiornati anche mentre era spento.
      if (kind === 'reminder') await rescheduleReminder(on, await readLastActivity(meta));
      return null;
    },
    [meta, settings],
  );

  return { settings, ready, blocked, set };
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
