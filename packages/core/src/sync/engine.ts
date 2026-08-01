/**
 * Motore di sincronizzazione.
 *
 * Cicla pull → applica → push. Gli update Yjs sono idempotenti e commutativi, quindi non
 * serve un handshake: bastano un log append-only e un cursore per dispositivo.
 *
 * Ordine deliberato: **prima si scarica, poi si invia.** Al contrario, un dispositivo
 * rimasto offline a lungo caricherebbe la propria storia prima di conoscere quella
 * dell'altro, allungando il log del relay senza alcun vantaggio.
 */
import * as Y from 'yjs';
import { RelayError, type RelayClient } from './relay-client';
import type { SyncCursorStore, SyncEngineOptions, SyncState } from './types';

const DEFAULT_POLL_MS = 15_000;
const DEFAULT_INITIAL_BACKOFF_MS = 2_000;
const DEFAULT_MAX_BACKOFF_MS = 300_000;

export interface SyncOutcome {
  pulled: number;
  pushed: number;
  undecryptable: number;
  /** `true` se è stato ripubblicato lo stato completo per riparare il log. */
  snapshotPushed: boolean;
}

export class SyncEngine {
  private readonly doc: Y.Doc;
  private readonly client: RelayClient;
  private readonly store: SyncCursorStore;
  private readonly pollIntervalMs: number;
  private readonly initialBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  private state: SyncState = { phase: 'idle' };
  private readonly listeners = new Set<(state: SyncState) => void>();

  /** Update locali non ancora accettati dal relay. */
  private pending: Uint8Array[] = [];
  private running = false;
  private stopped = false;
  private backoffMs: number;
  /** Un giro alla volta: due cicli concorrenti duplicherebbero le scritture. */
  private inFlight: Promise<SyncOutcome | null> | null = null;

  private readonly onLocalUpdate = (update: Uint8Array, origin: unknown): void => {
    // Gli update applicati dal motore stesso arrivano dal relay: rimandarli indietro
    // creerebbe un ciclo infinito fra i due dispositivi.
    if (origin === this) return;
    this.pending.push(update);
    void this.store.setPending(this.pending);
  };

  constructor(
    doc: Y.Doc,
    client: RelayClient,
    store: SyncCursorStore,
    options: SyncEngineOptions = {},
  ) {
    this.doc = doc;
    this.client = client;
    this.store = store;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_MS;
    this.initialBackoffMs = options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.backoffMs = this.initialBackoffMs;
  }

  getState(): SyncState {
    return this.state;
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(state: SyncState): void {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  }

  /** Riprende la coda salvata e inizia a osservare le modifiche locali. */
  async start(): Promise<void> {
    this.pending = await this.store.getPending();
    this.doc.on('update', this.onLocalUpdate);
  }

  /** Smette di osservare. Non annulla un ciclo già in corso. */
  stop(): void {
    this.stopped = true;
    this.doc.off('update', this.onLocalUpdate);
  }

  /** Numero di update in attesa di essere inviati. */
  get pendingCount(): number {
    return this.pending.length;
  }

  /**
   * Esegue un ciclo completo.
   *
   * Se un ciclo è già in corso restituisce quello, invece di avviarne un secondo: due
   * cicli concorrenti invierebbero gli stessi update due volte.
   */
  async syncOnce(): Promise<SyncOutcome | null> {
    if (this.inFlight !== null) return this.inFlight;
    this.inFlight = this.runCycle().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async runCycle(): Promise<SyncOutcome | null> {
    this.setState({ phase: 'syncing' });

    try {
      const outcome = await this.exchange();
      this.backoffMs = this.initialBackoffMs;
      this.setState({ phase: 'synced', at: this.now() });
      return outcome;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (error instanceof RelayError && error.permanent) {
        // Token errato o richiesta malformata: ritentare darebbe lo stesso esito.
        // Il backoff va comunque al massimo, così non si martella il relay.
        this.backoffMs = this.maxBackoffMs;
      } else {
        this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
      }

      this.setState({ phase: 'error', message, retryAt: this.now() + this.backoffMs });
      return null;
    }
  }

  /** Un giro: scarica e applica, poi invia la coda. */
  private async exchange(): Promise<SyncOutcome> {
    let pulled = 0;
    let undecryptable = 0;
    let cursor = await this.store.getCursor();

    // Ciclo di paginazione: il relay restituisce al massimo 200 update per risposta.
    for (;;) {
      const result = await this.client.pull(cursor);
      undecryptable += result.undecryptable;

      if (result.updates.length > 0) {
        // Una sola transazione: gli osservatori della UI vengono notificati una volta,
        // a stato completo, invece che a ogni singolo update.
        this.doc.transact(() => {
          for (const { update } of result.updates) {
            Y.applyUpdate(this.doc, update, this);
          }
        }, this);

        pulled += result.updates.length;
        cursor = result.updates[result.updates.length - 1]?.seq ?? cursor;
        await this.store.setCursor(cursor);
      } else if (result.head > cursor) {
        // Tutti i blob della pagina erano indecifrabili: senza avanzare il cursore si
        // rileggerebbero all'infinito, bloccando la sincronizzazione per sempre.
        cursor = result.head;
        await this.store.setCursor(cursor);
      }

      if (!result.hasMore) break;
    }

    // Push dopo il pull, e a lotti: `push` accetta al massimo 100 blob per volta.
    let pushed = 0;
    while (this.pending.length > 0) {
      const { accepted } = await this.client.push(this.pending);
      if (accepted === 0) break;
      // Si rimuovono **solo** quelli accettati: gli altri restano in coda.
      this.pending = this.pending.slice(accepted);
      await this.store.setPending(this.pending);
      pushed += accepted;
    }

    // Se qualche blob non era decifrabile, il log del relay ha un buco — e in Yjs un
    // buco non perde un solo update: **blocca tutti i successivi dello stesso
    // dispositivo**, perché gli struct successivi attendono quelli mancanti.
    //
    // Ripubblicando il proprio stato completo, questo dispositivo rende recuperabili i
    // propri dati indipendentemente dai buchi. Facendolo entrambi i dispositivi quando
    // rilevano corruzione, il vault si ripara da solo invece di restare bloccato.
    let snapshotPushed = false;
    if (undecryptable > 0) {
      await this.pushSnapshot();
      snapshotPushed = true;
    }

    return { pulled, pushed, undecryptable, snapshotPushed };
  }

  /**
   * Pubblica lo stato completo del documento come un unico update.
   *
   * Uno stato completo non ha dipendenze mancanti: applicarlo colma qualunque buco nel
   * log. È il meccanismo di recupero quando un blob risulta indecifrabile, e serve anche
   * per la compattazione periodica.
   */
  async pushSnapshot(): Promise<void> {
    const snapshot = Y.encodeStateAsUpdate(this.doc);
    await this.client.push([snapshot]);
  }

  /**
   * Ciclo continuo finché non viene fermato.
   *
   * Attende `pollIntervalMs` dopo un giro riuscito, o il backoff corrente dopo un
   * fallimento. Da lanciare senza attendere.
   */
  async runForever(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stopped = false;

    while (!this.stopped) {
      const outcome = await this.syncOnce();
      await this.sleep(outcome === null ? this.backoffMs : this.pollIntervalMs);
    }

    this.running = false;
  }
}
