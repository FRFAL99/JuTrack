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
  | { phase: 'error'; message: string; retryAt: number };

/** Persistenza del cursore e della coda di invio. */
export interface SyncCursorStore {
  /** Ultimo `seq` applicato dal relay. `0` se non si è mai sincronizzato. */
  getCursor(): Promise<number>;
  setCursor(seq: number): Promise<void>;
  /** Update prodotti localmente e non ancora accettati dal relay. */
  getPending(): Promise<Uint8Array[]>;
  setPending(updates: Uint8Array[]): Promise<void>;
}

/** Client HTTP minimo, per non dipendere da una `fetch` globale. */
export interface HttpClient {
  request(
    url: string,
    init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: string },
  ): Promise<{ status: number; text: () => Promise<string> }>;
}

export interface SyncEngineOptions {
  /** Intervallo fra due cicli riusciti. Default 15 s. */
  pollIntervalMs?: number;
  /** Attesa iniziale dopo un errore, poi raddoppia. Default 2 s. */
  initialBackoffMs?: number;
  /** Tetto del backoff. Default 5 min. */
  maxBackoffMs?: number;
  now?: () => number;
  /** Attende `ms`. Iniettabile per rendere i test istantanei. */
  sleep?: (ms: number) => Promise<void>;
}
