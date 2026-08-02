/**
 * Motore di sincronizzazione.
 *
 * Cicla pull → applica → push. Gli update Yjs sono idempotenti e commutativi, quindi non
 * serve un handshake: bastano un log append-only e un cursore per dispositivo.
 *
 * Ordine deliberato: **prima si scarica, poi si invia.** Al contrario, un dispositivo
 * rimasto offline a lungo caricherebbe la propria storia prima di conoscere quella
 * dell'altro, allungando il log del relay senza alcun vantaggio.
 *
 * Due proprietà non ovvie, entrambe imparate da una prova con due telefoni veri:
 *
 * 1. **La coda non basta.** Osservare gli update dal vivo cattura solo ciò che si scrive
 *    mentre il motore è acceso. Tutto il resto — la persistenza ricaricata all'avvio, il
 *    seed, le spese registrate prima che il vault esistesse — non passerebbe mai di qui.
 *    Da cui il catch-up in `start()`.
 * 2. **Un ciclo che riporta `synced` non dimostra che i due lati siano allineati.** Un
 *    cursore che salta troppo avanti, o un delta mai inviato, danno esattamente lo stesso
 *    esito visibile di una sincronizzazione riuscita.
 */
import * as Y from 'yjs';
import { RelayError, type RelayClient } from './relay-client';
import type { PollStep, SyncCursorStore, SyncEngineOptions, SyncState } from './types';

/**
 * Scala di default: stretta finché qualcuno guarda, larga man mano che si allontana.
 *
 * Il gradino binario di prima (3 s dentro due minuti, 30 s fuori) pagava il ritmo più
 * caro per l'intera finestra attiva anche a schermo fermo. Con la scala il primo tratto
 * è più veloce di prima — due secondi, non tre — e il costo complessivo di una giornata
 * cala comunque di circa tre quarti.
 */
const DEFAULT_POLL_SCHEDULE: readonly PollStep[] = [
  { afterMs: 0, pollMs: 2_000 },
  { afterMs: 15_000, pollMs: 5_000 },
  { afterMs: 60_000, pollMs: 15_000 },
  { afterMs: 300_000, pollMs: 60_000 },
];
/** Poll quando c'è stata attività di recente: è il ritmo che l'utente percepisce. */
const DEFAULT_ACTIVE_POLL_MS = 3_000;
/** Poll a riposo: nessuno sta guardando, basta non restare indietro. */
const DEFAULT_IDLE_POLL_MS = 30_000;
/** Per quanto si resta «attivi» dopo l'ultima attività. */
const DEFAULT_ACTIVE_WINDOW_MS = 120_000;
/** Attesa fra una modifica locale e l'invio, per raggruppare le raffiche. */
const DEFAULT_DEBOUNCE_MS = 400;
const DEFAULT_INITIAL_BACKOFF_MS = 2_000;
const DEFAULT_MAX_BACKOFF_MS = 300_000;
/** Attesa dopo un guasto di rete: fallisce localmente, quindi ritentare non costa nulla. */
const DEFAULT_OFFLINE_RETRY_MS = 15_000;

/**
 * Peso di un delta Yjs che non contiene nulla.
 *
 * `encodeStateAsUpdate` restituisce sempre almeno due byte (due lunghezze a zero): sono
 * la soglia sotto la quale non c'è niente da pubblicare.
 */
const EMPTY_UPDATE_BYTES = 2;

/**
 * Intervallo di poll dopo `idleForMs` di inattività: l'ultima soglia superata.
 *
 * Pura ed esportata apposta — è la sola logica della scala, e provarla non deve
 * richiedere di costruire un motore, un relay e un documento.
 */
export function pollIntervalFor(schedule: readonly PollStep[], idleForMs: number): number {
  let interval = schedule[0]!.pollMs;
  for (const step of schedule) {
    if (idleForMs < step.afterMs) break;
    interval = step.pollMs;
  }
  return interval;
}

/**
 * Costruisce la scala dalle opzioni, e la rifiuta se è malformata.
 *
 * La validazione sta **nel costruttore** e non al primo uso: una scala vuota scoperta
 * dentro `pollIntervalMs` diventerebbe un `undefined` passato a `sleep`, cioè un ciclo
 * che gira a piena velocità contro il relay senza che nulla lo segnali.
 */
function resolvePollSchedule(options: SyncEngineOptions): readonly PollStep[] {
  // Le tre opzioni della forma precedente vincono se ne arriva anche una sola: chi le
  // passa sta chiedendo esattamente due gradini, e riscriverle come scala qui evita di
  // avere due percorsi di calcolo nel motore.
  const legacy =
    options.activePollMs !== undefined ||
    options.idlePollMs !== undefined ||
    options.activeWindowMs !== undefined;

  if (legacy) {
    const activeWindowMs = options.activeWindowMs ?? DEFAULT_ACTIVE_WINDOW_MS;
    return [
      { afterMs: 0, pollMs: options.activePollMs ?? DEFAULT_ACTIVE_POLL_MS },
      // `+ 1`: la finestra attiva includeva il suo ultimo istante (`idleFor <= window`).
      { afterMs: activeWindowMs + 1, pollMs: options.idlePollMs ?? DEFAULT_IDLE_POLL_MS },
    ];
  }

  const schedule = options.pollSchedule ?? DEFAULT_POLL_SCHEDULE;

  if (schedule.length === 0) throw new Error('pollSchedule non può essere vuota');
  if (schedule[0]!.afterMs !== 0) {
    throw new Error('pollSchedule deve iniziare da afterMs 0: senza, non c’è un gradino iniziale');
  }
  for (const [i, step] of schedule.entries()) {
    if (!(step.pollMs > 0)) {
      throw new Error(`pollSchedule: pollMs deve essere positivo (gradino ${i}: ${step.pollMs})`);
    }
    const previous = schedule[i - 1];
    if (previous !== undefined && !(step.afterMs > previous.afterMs)) {
      throw new Error(
        `pollSchedule: le soglie devono crescere (gradino ${i}: ${step.afterMs} dopo ${previous.afterMs})`,
      );
    }
  }
  return schedule;
}

/** Confronto byte a byte, con `null` che non è mai uguale a nulla. */
function sameBytes(a: Uint8Array, b: Uint8Array | null): boolean {
  if (b === null || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

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
  private readonly pollSchedule: readonly PollStep[];
  private readonly debounceMs: number;
  private readonly initialBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly offlineRetryMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly schedule: (fn: () => void, ms: number) => () => void;

  private state: SyncState = { phase: 'idle' };
  private readonly listeners = new Set<(state: SyncState) => void>();

  /** Update locali non ancora accettati dal relay. */
  private pending: Uint8Array[] = [];
  private running = false;
  private stopped = false;
  private paused = false;
  /** Acceso da un errore senza rimedio: il ciclo non riparte da solo. */
  private blocked = false;
  private backoffMs: number;
  /**
   * Quanto attendere dopo l'ultimo giro fallito.
   *
   * Distinto da `backoffMs` perché i due guasti non sono la stessa cosa: il backoff
   * protegge un relay in difficoltà e va conservato, l'attesa di un guasto di rete no.
   * Tenerli separati è ciò che impedisce a una galleria di far ripartire da capo la
   * progressione maturata contro un relay che stava rispondendo 500.
   */
  private retryDelayMs: number;
  /** Un giro alla volta: due cicli concorrenti duplicherebbero le scritture. */
  private inFlight: Promise<SyncOutcome | null> | null = null;
  /**
   * State vector dell'ultima scrittura **riuscita**, per non riscriverlo identico.
   *
   * A vault fermo il documento non cambia, e registrarlo a ogni ciclo è un `fsync`
   * inutile ogni pochi secondi, per ore.
   */
  private lastPushedStateVector: Uint8Array | null = null;

  /** Ultimo momento in cui è successo qualcosa: decide il ritmo del poll. */
  private lastActivityAt: number;
  /** Annulla il debounce in corso, se ce n'è uno. */
  private cancelDebounce: (() => void) | null = null;
  /** Risolve il sonno in corso, quando c'è un sonno in corso. */
  private wakeSleep: (() => void) | null = null;
  /** Sveglia arrivata mentre non si dormiva: il prossimo sonno la consuma. */
  private wakeRequested = false;

  private readonly onLocalUpdate = (update: Uint8Array, origin: unknown): void => {
    // Gli update applicati dal motore stesso arrivano dal relay: rimandarli indietro
    // creerebbe un ciclo infinito fra i due dispositivi.
    if (origin === this) return;
    this.pending.push(update);
    void this.store.setPending(this.pending);
    this.lastActivityAt = this.now();
    this.scheduleWake();
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
    this.pollSchedule = resolvePollSchedule(options);
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.initialBackoffMs = options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
    this.offlineRetryMs = options.offlineRetryMs ?? DEFAULT_OFFLINE_RETRY_MS;
    this.now = options.now ?? (() => Date.now());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.schedule =
      options.schedule ??
      ((fn, ms) => {
        const id = setTimeout(fn, ms);
        return () => clearTimeout(id);
      });
    this.backoffMs = this.initialBackoffMs;
    this.retryDelayMs = this.initialBackoffMs;
    // Il motore nasce quando l'app si apre: è per definizione un momento attivo.
    this.lastActivityAt = this.now();
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

  /**
   * Riprende la coda salvata, pubblica ciò che il documento contiene già e inizia a
   * osservare le modifiche locali.
   *
   * Il secondo punto è quello che conta. `onLocalUpdate` vede solo gli update prodotti
   * **dopo** questa chiamata, e la persistenza carica il documento prima, con un'origine
   * diversa: senza il catch-up, la storia di questo dispositivo non lascerebbe mai il
   * telefono, e i cicli riporterebbero comunque `synced`.
   */
  async start(): Promise<void> {
    this.pending = await this.store.getPending();

    const pushed = await this.store.getPushedStateVector();
    // La cache parte dalla lettura che avviene comunque qui: nessuna lettura in più.
    this.lastPushedStateVector = pushed;
    // `undefined` e non `null`: senza state vector si pubblica il documento intero.
    const delta = Y.encodeStateAsUpdate(this.doc, pushed ?? undefined);
    if (delta.length > EMPTY_UPDATE_BYTES) {
      this.pending.push(delta);
      await this.store.setPending(this.pending);
    }

    this.doc.on('update', this.onLocalUpdate);
  }

  /** Smette di osservare. Non annulla un ciclo già in corso. */
  stop(): void {
    this.stopped = true;
    this.cancelDebounce?.();
    this.cancelDebounce = null;
    this.doc.off('update', this.onLocalUpdate);
    // Senza, il ciclo resterebbe addormentato fino alla fine del poll corrente prima di
    // accorgersi di essere stato fermato.
    this.wake();
  }

  /**
   * Sospende il ciclo continuo senza smettere di osservare il documento.
   *
   * Da usare quando l'app va in background: le modifiche continuano a entrare in coda e
   * partono al ritorno in primo piano.
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Riprende il ciclo, azzera il backoff e fa subito un giro.
   *
   * L'azzeramento non è un dettaglio: dopo qualche errore di rete il backoff arriva a
   * cinque minuti, e senza questo il ritorno della connettività non cambierebbe nulla
   * per parecchio tempo.
   */
  resume(): void {
    this.paused = false;
    this.backoffMs = this.initialBackoffMs;
    this.retryDelayMs = this.initialBackoffMs;
    this.lastActivityAt = this.now();
    this.wake();
  }

  /**
   * Dichiara che qualcuno sta guardando dati condivisi: riporta il poll al gradino più
   * stretto e sveglia l'attesa in corso.
   *
   * È il verso giusto della cosa. L'opposto — sospendere il ciclo quando nessuna
   * schermata di dati è a fuoco — passerebbe da `pause()`, che ferma anche il **push**:
   * una pausa rimasta appesa sarebbe una spesa scritta che non parte, in silenzio.
   * Dimenticare un `markActive` produce invece soltanto un poll più lento.
   */
  markActive(): void {
    this.lastActivityAt = this.now();
    this.wake();
  }

  /** Interrompe l'attesa in corso, così il prossimo giro parte subito. */
  wake(): void {
    const resolve = this.wakeSleep;
    if (resolve === null) {
      // Nessuno sta dormendo: la sveglia resta appesa e la consuma il prossimo sonno.
      this.wakeRequested = true;
      return;
    }
    this.wakeSleep = null;
    resolve();
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

      if (error instanceof RelayError && error.fatal) {
        // Il relay ci rifiuta: ritentare darebbe lo stesso esito per sempre. Si ferma
        // il ciclo e lo si dichiara, invece di lasciare un indicatore che sembra in
        // attesa di un prossimo tentativo che risolverà.
        this.blocked = true;
        this.wake();
        this.setState({ phase: 'blocked', message });
        return null;
      }

      if (!(error instanceof RelayError)) {
        // Il relay non è stato raggiunto affatto: è un guasto di rete, non un rifiuto.
        // La richiesta è fallita **localmente**, quindi ritentare presto non costa nulla
        // a nessuno — ed è l'unico modo che abbiamo di accorgerci che la rete è tornata.
        //
        // `backoffMs` **non si tocca**: se il relay stava rispondendo 500 e poi è caduta
        // la rete, al ritorno non si deve ricominciare da due secondi a martellare un
        // relay ancora in difficoltà.
        this.retryDelayMs = Math.max(this.offlineRetryMs, this.pollIntervalMs());
        // Mostrare il messaggio grezzo di `fetch` non aiuterebbe nessuno.
        this.setState({ phase: 'offline' });
        return null;
      }

      if (error.permanent) {
        // Richiesta malformata o troppo grande: ritentare uguale darebbe lo stesso
        // esito, ma una richiesta diversa può riuscire. Backoff al massimo.
        this.backoffMs = this.maxBackoffMs;
      } else {
        this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
      }
      this.retryDelayMs = this.backoffMs;

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
        // Ha scritto l'altro dispositivo: qualcuno sta usando l'app adesso.
        this.lastActivityAt = this.now();
      }

      // Si avanza all'ultimo `seq` **visto**, non all'ultimo applicato: i blob
      // indecifrabili sono già stati contati, e rileggerli a ogni giro bloccherebbe la
      // sincronizzazione per sempre. E mai a `head`, che è la fine dell'intero log: con
      // `hasMore` acceso salterebbe in silenzio tutti gli update validi che seguono.
      if (result.lastSeq > cursor) {
        cursor = result.lastSeq;
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

    // Solo a coda vuota: con update ancora in attesa, registrare lo stato corrente come
    // «pubblicato» li cancellerebbe dal catch-up del prossimo avvio, e sparirebbero
    // senza che nulla lo segnali. Gli update appena scaricati sono per definizione già
    // sul relay, quindi includerli è corretto e impedisce che tornino indietro.
    //
    // E solo se è cambiato: a vault fermo il documento è identico giro dopo giro, e
    // riscriverlo sarebbe un `fsync` ogni pochi secondi per ore.
    if (this.pending.length === 0) {
      const stateVector = Y.encodeStateVector(this.doc);
      if (!sameBytes(stateVector, this.lastPushedStateVector)) {
        await this.store.setPushedStateVector(stateVector);
        // **Dopo** la scrittura, mai prima. Con la cache già avanzata, una scrittura
        // fallita farebbe credere al giro successivo di aver pubblicato ciò che non ha
        // pubblicato, e al riavvio il catch-up di `start()` salterebbe quel delta: spese
        // sparite in silenzio.
        this.lastPushedStateVector = stateVector;
      }
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
   * Attende l'intervallo di poll dopo un giro riuscito, o il backoff corrente dopo un
   * fallimento — ma il sonno è interrompibile: una modifica locale lo sveglia, così una
   * spesa parte subito invece di aspettare la fine dell'attesa in corso. Da lanciare
   * senza attendere.
   */
  async runForever(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stopped = false;

    while (!this.stopped && !this.blocked) {
      if (this.paused) {
        // In background non si interroga il relay: è un sonno senza rete, quindi tanto
        // vale il gradino più largo della scala. `resume()` lo sveglia.
        await this.interruptibleSleep(this.pollSchedule[this.pollSchedule.length - 1]!.pollMs);
        continue;
      }

      const outcome = await this.syncOnce();
      if (this.stopped || this.blocked) break;
      await this.interruptibleSleep(outcome === null ? this.retryDelayMs : this.pollIntervalMs());
    }

    this.running = false;
  }

  /**
   * Intervallo corrente fra due giri: il gradino della scala corrispondente a quanto
   * tempo è passato dall'ultima attività.
   *
   * Il poll fisso costringeva a scegliere fra latenza e consumo. La scala paga il ritmo
   * stretto solo finché serve davvero, e si allarga da sé man mano che l'attività si
   * allontana — senza mai fermarsi, perché un push in coda deve poter partire.
   */
  private pollIntervalMs(): number {
    return pollIntervalFor(this.pollSchedule, this.now() - this.lastActivityAt);
  }

  /** Attende `ms`, o meno se qualcuno chiama `wake()`. */
  private async interruptibleSleep(ms: number): Promise<void> {
    if (this.wakeRequested) {
      this.wakeRequested = false;
      return;
    }

    try {
      await Promise.race([
        this.sleep(ms),
        new Promise<void>((resolve) => {
          this.wakeSleep = resolve;
        }),
      ]);
    } finally {
      this.wakeSleep = null;
      this.wakeRequested = false;
    }
  }

  /**
   * Programma una sveglia dopo il debounce, annullando quella precedente.
   *
   * Il ciclo resta l'unico a parlare col relay: qui non si sincronizza, si accorcia
   * soltanto l'attesa. Avviare un `syncOnce()` da qui creerebbe un secondo motore in
   * parallelo a quello di `runForever`.
   */
  private scheduleWake(): void {
    this.cancelDebounce?.();
    this.cancelDebounce = this.schedule(() => {
      this.cancelDebounce = null;
      this.wake();
    }, this.debounceMs);
  }
}
