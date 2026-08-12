/**
 * Quali avvisi ha acceso chi usa questo telefono.
 *
 * Vive in `app_meta` come il layout della dashboard, e per la stessa ragione: è una scelta
 * di chi guarda, non un dato del gruppo. Scriverla nel documento Yjs vorrebbe dire che
 * accendere un promemoria per sé lo accende anche all'altra persona — e genererebbe un
 * update cifrato per ogni interruttore toccato. `wipe.ts` la porta via da sola con il suo
 * `DELETE FROM app_meta`.
 *
 * **Un interruttore per avviso, non uno solo.** Sono tre motivi diversi di essere
 * interrotti — non registri spese, hai sforato un budget, la sincronizzazione è ferma — e
 * chi ne vuole uno non vuole necessariamente gli altri due. Adesso ci sono tutti e tre, e
 * `parseSettings` era scritta perché aggiungere il terzo non toccasse le righe degli altri:
 * infatti non le ha toccate.
 */

export interface NotificationSettings {
  /** Promemoria «non registri una spesa da un po'» (Step 31). */
  reminder: boolean;
  /** Avviso «una categoria è vicina al limite del mese, o l'ha superato» (Step 32). */
  budget: boolean;
  /** Avviso «le spese non arrivano agli altri telefoni da un pezzo» (Step 33). */
  sync: boolean;
}

/** La chiave in `app_meta`. Una sola per tutti gli avvisi. */
export const SETTINGS_KEY = 'notification_settings';

/**
 * Tutto spento.
 *
 * Non è prudenza generica: accendere di default significherebbe chiedere il permesso di
 * notificare a chi aggiorna l'app senza aver chiesto niente, e mandare il primo avviso tre
 * giorni dopo a qualcuno che non sa da dove arrivi.
 */
export const DEFAULT_SETTINGS: NotificationSettings = {
  reminder: false,
  budget: false,
  sync: false,
};

/**
 * Rilegge le impostazioni, **trattando come spento tutto ciò che non si capisce**.
 *
 * Stesso criterio di `parseLayout` e `loadProfile`: un valore illeggibile e un valore mai
 * scritto portano allo stesso posto. Qui la direzione dell'errore conta più del solito —
 * ripiegare su «acceso» farebbe comparire notifiche che nessuno ha chiesto, e un avviso di
 * troppo si nota molto più di uno mancante.
 *
 * Ogni chiave si legge per conto suo: il campo aggiunto dallo Step 33 su un telefono che ha
 * ancora le impostazioni scritte dal 32 si legge come spento, senza che il resto cada.
 */
export function parseSettings(raw: string | null): NotificationSettings {
  if (raw === null) return DEFAULT_SETTINGS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;

  const { reminder, budget, sync } = parsed as Record<string, unknown>;
  return { reminder: reminder === true, budget: budget === true, sync: sync === true };
}

export function serializeSettings(settings: NotificationSettings): string {
  return JSON.stringify(settings);
}
