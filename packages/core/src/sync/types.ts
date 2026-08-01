/**
 * Interfacce del motore di sincronizzazione.
 *
 * Come per il crypto, le dipendenze dalla piattaforma entrano per iniezione: il core
 * non sa nulla di `fetch`, di come si persiste un cursore o di come si rileva la rete.
 */

/** Stato osservabile del sync, per l'indicatore nella UI. */
export type SyncState =
  /** Mai sincronizzato in questa sessione. */
  | { phase: 'idle' }
  /** Scambio in corso. */
  | { phase: 'syncing' }
  /** Ultimo giro riuscito. */
  | { phase: 'synced'; at: number }
  /** Nessuna connessione: le modifiche restano in coda. */
  | { phase: 'offline' }
  /**
   * Ultimo tentativo fallito. `retryAt` è il momento del prossimo tentativo.
   * L'errore va mostrato, non ingoiato: un sync che fallisce in silenzio fa credere
   * all'utente che i due telefoni siano allineati quando non lo sono.
   */
  | { phase: 'error'; message: string; retryAt: number }
  /**
   * Il relay rifiuta l'accesso: il ciclo è stato **fermato**, non rimandato.
   *
   * Ritentare darebbe lo stesso esito per sempre. Distinto da `error` perché la
   * differenza è visibile all'utente: qui non c'è un prossimo tentativo da aspettare,
   * serve un intervento.
   */
  | { phase: 'blocked'; message: string };

/** Persistenza del cursore e della coda di invio. */
export interface SyncCursorStore {
  /** Ultimo `seq` applicato dal relay. `0` se non si è mai sincronizzato. */
  getCursor(): Promise<number>;
  setCursor(seq: number): Promise<void>;
  /** Update prodotti localmente e non ancora accettati dal relay. */
  getPending(): Promise<Uint8Array[]>;
  setPending(updates: Uint8Array[]): Promise<void>;
  /**
   * State vector del documento al momento dell'ultima pubblicazione riuscita.
   *
   * È ciò che permette al motore di sapere, alla partenza, **cosa del documento non è
   * mai stato inviato**. Senza, tutto ciò che è stato scritto prima che il motore
   * esistesse (persistenza ricaricata, seed, spese registrate senza vault) non
   * raggiungerebbe mai il relay: la coda contiene solo gli update osservati dal vivo.
   *
   * `null` se non si è mai pubblicato nulla.
   */
  getPushedStateVector(): Promise<Uint8Array | null>;
  setPushedStateVector(stateVector: Uint8Array): Promise<void>;
}

/** Client HTTP minimo, per non dipendere da una `fetch` globale. */
export interface HttpClient {
  request(
    url: string,
    init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string },
  ): Promise<{ status: number; text: () => Promise<string> }>;
}

export interface SyncEngineOptions {
  /**
   * Intervallo fra due cicli quando c'è attività recente. Default 3 s.
   *
   * È il ritmo che si vede: una spesa creata sull'altro telefono compare entro questo
   * tempo. Vale solo dentro la finestra attiva, altrimenti sarebbe una richiesta ogni
   * tre secondi tutto il giorno.
   */
  activePollMs?: number;
  /** Intervallo fra due cicli a riposo. Default 30 s. */
  idlePollMs?: number;
  /** Durata della finestra attiva dopo l'ultima attività. Default 2 min. */
  activeWindowMs?: number;
  /**
   * Attesa fra una modifica locale e l'invio. Default 400 ms.
   *
   * Si azzera a ogni nuovo update: una raffica di scritture (un form salvato, un
   * import) produce **una** richiesta invece di una per update.
   */
  debounceMs?: number;
  /**
   * Base del backoff. Default 2 s.
   *
   * La prima attesa dopo un errore è già il doppio di questo valore, e da lì raddoppia
   * fino a `maxBackoffMs`.
   */
  initialBackoffMs?: number;
  /** Tetto del backoff. Default 5 min. */
  maxBackoffMs?: number;
  now?: () => number;
  /** Attende `ms`. Iniettabile per rendere i test istantanei. */
  sleep?: (ms: number) => Promise<void>;
  /**
   * Pianifica `fn` fra `ms`, restituendo come annullarla. Default `setTimeout`.
   *
   * Separata da `sleep` perché serve poterla annullare — è il debounce dell'invio — e
   * perché i test devono poter controllare le due attese in modo indipendente.
   */
  schedule?: (fn: () => void, ms: number) => () => void;
}
