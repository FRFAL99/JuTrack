/**
 * Persistenza del documento Yjs su SQLite.
 *
 * Scritta a mano invece di adottare `y-expo-sqlite`: quel package è un fork con due
 * commit e nessuna garanzia di manutenzione, e finirebbe sul percorso critico
 * dell'integrità dei dati. Qui sono un centinaio di righe che controlliamo, e ci serve
 * comunque logica custom per il cursore di sync.
 *
 * Schema: un log append-only di update binari. Yjs garantisce che applicarli tutti in
 * qualunque ordine ricostruisca lo stesso documento, quindi non serve né ordinamento né
 * transazionalità sofisticata.
 *
 *   CREATE TABLE y_updates (seq INTEGER PRIMARY KEY AUTOINCREMENT, data BLOB NOT NULL)
 *
 * Il log cresce a ogni modifica: oltre `compactAfter` update, si sostituisce l'intero
 * contenuto con un unico snapshot. Senza compattazione l'avvio dell'app rallenterebbe
 * in proporzione alla storia completa del vault.
 */
import * as Y from 'yjs';
import type { SqliteDatabase } from './types';

export interface PersistenceOptions {
  /**
   * Numero di update oltre il quale compattare in un unico snapshot.
   * Default 200: abbastanza da non compattare a ogni spesa, poco da tenere l'avvio rapido.
   */
  compactAfter?: number;
  /** Nome della tabella. Consente più documenti nello stesso database. */
  tableName?: string;
}

export class SqliteYPersistence {
  private readonly db: SqliteDatabase;
  private readonly doc: Y.Doc;
  private readonly table: string;
  private readonly compactAfter: number;

  private pendingUpdates = 0;
  private destroyed = false;
  /**
   * Catena delle scritture in corso.
   *
   * Gli update di Yjs arrivano in modo sincrono, ma la scrittura su SQLite è asincrona.
   * Serializzandole su una singola promise si evita che due scritture concorrenti si
   * intreccino con una compattazione — che cancella la tabella e la riscrive.
   */
  private writeQueue: Promise<void> = Promise.resolve();

  private readonly onUpdate = (update: Uint8Array, origin: unknown): void => {
    // Gli update che arrivano da questa stessa persistenza sono già su disco:
    // riscriverli creerebbe un ciclo.
    if (origin === this) return;
    this.enqueue(() => this.persistUpdate(update));
  };

  constructor(db: SqliteDatabase, doc: Y.Doc, options: PersistenceOptions = {}) {
    this.db = db;
    this.doc = doc;
    this.table = options.tableName ?? 'y_updates';
    this.compactAfter = options.compactAfter ?? 200;
  }

  /**
   * Crea lo schema e applica al documento tutti gli update salvati.
   *
   * Da attendere prima di leggere il documento: altrimenti la UI mostrerebbe un vault
   * vuoto per una frazione di secondo, prima di riempirsi.
   */
  async load(): Promise<void> {
    await this.db.execute(
      `CREATE TABLE IF NOT EXISTS ${this.table} (
         seq INTEGER PRIMARY KEY AUTOINCREMENT,
         data BLOB NOT NULL
       )`,
    );

    const rows = await this.db.query<{ data: Uint8Array }>(
      `SELECT data FROM ${this.table} ORDER BY seq ASC`,
    );

    if (rows.length > 0) {
      // Un'unica transazione Yjs per tutti gli update: gli osservatori vengono
      // notificati una volta sola, a documento completo, invece che a ogni riga.
      this.doc.transact(() => {
        for (const row of rows) {
          Y.applyUpdate(this.doc, toBytes(row.data), this);
        }
      }, this);
    }

    this.pendingUpdates = rows.length;
    this.doc.on('update', this.onUpdate);

    if (this.pendingUpdates > this.compactAfter) {
      this.enqueue(() => this.compact());
    }
  }

  /** Sostituisce l'intero log con un unico snapshot dello stato corrente. */
  async compact(): Promise<void> {
    const snapshot = Y.encodeStateAsUpdate(this.doc);

    // L'ordine INSERT → DELETE è deliberato e non va invertito.
    //
    // Se il processo muore fra le due istruzioni, sul database restano i vecchi update
    // *più* lo snapshot: al riavvio si applicano tutti e il documento è corretto, perché
    // gli update Yjs sono idempotenti. Un DELETE prima dell'INSERT lascerebbe invece la
    // tabella vuota, con perdita totale dei dati locali.
    await this.db.execute(`INSERT INTO ${this.table} (data) VALUES (?)`, [snapshot]);
    await this.db.execute(
      `DELETE FROM ${this.table} WHERE seq < (SELECT MAX(seq) FROM ${this.table})`,
    );
    this.pendingUpdates = 1;
  }

  /** Numero di update attualmente sul log. Esposto per i test e la diagnostica. */
  async countStoredUpdates(): Promise<number> {
    const rows = await this.db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${this.table}`);
    return rows[0]?.n ?? 0;
  }

  /** Attende che tutte le scritture in coda siano completate. */
  async flush(): Promise<void> {
    await this.writeQueue;
  }

  /** Smette di osservare il documento. Le scritture già in coda vengono completate. */
  async destroy(): Promise<void> {
    // L'ordine conta ed è già stato sbagliato una volta.
    //
    // Gli update Yjs arrivano in modo sincrono e vengono accodati come microtask.
    // Marcando `destroyed` prima del flush, quei microtask trovavano il flag già
    // alzato e uscivano subito: ogni scrittura non ancora eseguita andava persa,
    // cioè l'app perdeva i dati recenti a ogni chiusura pulita.
    //
    // Corretto: prima si smette di accettare nuovi update, poi si svuota la coda,
    // e solo alla fine si marca l'oggetto come distrutto.
    this.doc.off('update', this.onUpdate);
    await this.flush();
    this.destroyed = true;
  }

  /** Cancella ogni traccia del documento dal database. */
  async clear(): Promise<void> {
    await this.flush();
    await this.db.execute(`DELETE FROM ${this.table}`);
    this.pendingUpdates = 0;
  }

  private enqueue(task: () => Promise<void>): void {
    this.writeQueue = this.writeQueue.then(task).catch((error: unknown) => {
      // Una scrittura fallita non deve interrompere la catena: le successive devono
      // comunque essere tentate, altrimenti un errore transitorio bloccherebbe per
      // sempre la persistenza.
      console.error('[SqliteYPersistence] scrittura fallita:', error);
    });
  }

  private async persistUpdate(update: Uint8Array): Promise<void> {
    if (this.destroyed) return;
    await this.db.execute(`INSERT INTO ${this.table} (data) VALUES (?)`, [update]);
    this.pendingUpdates++;
    if (this.pendingUpdates > this.compactAfter) {
      await this.compact();
    }
  }
}

/**
 * Normalizza il BLOB restituito dal driver.
 *
 * I driver SQLite restituiscono i BLOB in forme diverse — `Uint8Array`, `ArrayBuffer`,
 * o array di numeri. `Y.applyUpdate` accetta solo `Uint8Array`.
 */
function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  throw new Error(`BLOB in formato non riconosciuto: ${Object.prototype.toString.call(value)}`);
}
