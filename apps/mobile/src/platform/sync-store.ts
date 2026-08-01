import type { SqliteDatabase, SyncCursorStore } from '@jutrack/core';

/**
 * Cursore e coda di invio su SQLite.
 *
 * Devono sopravvivere alla chiusura dell'app: un cursore perso farebbe riscaricare
 * l'intero log, e una coda persa farebbe **sparire le spese registrate offline** senza
 * che nulla lo segnali.
 */
export class SqliteSyncStore implements SyncCursorStore {
  private constructor(private readonly db: SqliteDatabase) {}

  static async open(db: SqliteDatabase): Promise<SqliteSyncStore> {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS sync_state (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    );
    await db.execute(
      `CREATE TABLE IF NOT EXISTS sync_pending (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         data BLOB NOT NULL
       )`,
    );
    // Tabella separata da `sync_state` perché lo state vector è binario: passarlo per
    // una colonna TEXT vorrebbe dire base64 all'andata e al ritorno, cioè due
    // conversioni in più e un formato da sbagliare.
    await db.execute(
      `CREATE TABLE IF NOT EXISTS sync_meta (
         key TEXT PRIMARY KEY,
         data BLOB NOT NULL
       )`,
    );
    return new SqliteSyncStore(db);
  }

  async getCursor(): Promise<number> {
    const rows = await this.db.query<{ value: string }>(
      'SELECT value FROM sync_state WHERE key = ?',
      ['cursor'],
    );
    const raw = rows[0]?.value;
    const parsed = raw === undefined ? 0 : Number(raw);
    // Un valore corrotto non deve far ripartire il sync da un punto arbitrario:
    // meglio ricominciare da zero e riscaricare tutto, che è sempre sicuro.
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  async setCursor(seq: number): Promise<void> {
    await this.db.execute(
      'INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
      ['cursor', String(seq), String(seq)],
    );
  }

  async getPending(): Promise<Uint8Array[]> {
    const rows = await this.db.query<{ data: Uint8Array }>(
      'SELECT data FROM sync_pending ORDER BY id ASC',
    );
    return rows.map((row) => toBytes(row.data));
  }

  async setPending(updates: Uint8Array[]): Promise<void> {
    // Riscrittura completa invece di una differenza: la coda è piccola (decine di
    // update) e la logica incrementale introdurrebbe stati intermedi in cui un crash
    // lascerebbe la coda incoerente.
    //
    // In transazione, però: fuori da una, la finestra fra il DELETE e l'ultimo INSERT è
    // una coda **vuota** su disco. Un crash lì dentro — o la chiusura dell'app da parte
    // del sistema — farebbe sparire le spese registrate offline senza che nulla lo
    // segnali. È anche molto più veloce: un solo fsync invece di uno per riga.
    await this.db.execute('BEGIN');
    try {
      await this.db.execute('DELETE FROM sync_pending');
      for (const update of updates) {
        await this.db.execute('INSERT INTO sync_pending (data) VALUES (?)', [update]);
      }
      await this.db.execute('COMMIT');
    } catch (error) {
      // Senza ROLLBACK la transazione resterebbe aperta e ogni scrittura successiva
      // fallirebbe con «cannot start a transaction within a transaction».
      await this.db.execute('ROLLBACK').catch(() => undefined);
      throw error;
    }
  }

  async getPushedStateVector(): Promise<Uint8Array | null> {
    const rows = await this.db.query<{ data: Uint8Array }>(
      'SELECT data FROM sync_meta WHERE key = ?',
      ['pushed_state_vector'],
    );
    const raw = rows[0]?.data;
    return raw === undefined ? null : toBytes(raw);
  }

  async setPushedStateVector(stateVector: Uint8Array): Promise<void> {
    await this.db.execute(
      'INSERT INTO sync_meta (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = ?',
      ['pushed_state_vector', stateVector, stateVector],
    );
  }
}

function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  throw new Error(`BLOB in formato non riconosciuto: ${Object.prototype.toString.call(value)}`);
}
