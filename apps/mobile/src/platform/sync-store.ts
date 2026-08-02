import type { SqliteDatabase, SyncCursorStore } from '@jutrack/core';

/**
 * Cursore e coda di invio su SQLite, **separati per vault**.
 *
 * Devono sopravvivere alla chiusura dell'app: un cursore perso farebbe riscaricare
 * l'intero log, e una coda persa farebbe **sparire le spese registrate offline** senza
 * che nulla lo segnali.
 *
 * Ogni riga porta il `vault_id` del gruppo a cui appartiene. Con più gruppi sullo stesso
 * telefono la separazione non è cosmetica: due gruppi hanno cursori diversi sul proprio
 * log, e code di invio che non devono vedersi. Ogni istruzione qui dentro filtra per
 * `vault_id` — e quella che conta davvero è il DELETE di `setPending`.
 */
export class SqliteSyncStore implements SyncCursorStore {
  private constructor(
    private readonly db: SqliteDatabase,
    private readonly vaultId: string,
  ) {}

  static async open(db: SqliteDatabase, vaultId: string): Promise<SqliteSyncStore> {
    await SqliteSyncStore.ensureSchema(db);
    return new SqliteSyncStore(db, vaultId);
  }

  /**
   * Crea le tabelle se mancano.
   *
   * Chiamata anche da `forget`: uscire da un gruppo mai sincronizzato — creato e
   * abbandonato senza che il motore sia mai partito — altrimenti fallirebbe con
   * `no such table`, e l'utente resterebbe nel gruppo senza capire perché.
   */
  private static async ensureSchema(db: SqliteDatabase): Promise<void> {
    // Chiave primaria composta: la stessa chiave logica (`cursor`) esiste una volta per
    // gruppo. Con la sola `key` il secondo gruppo sovrascriverebbe il cursore del primo,
    // che poi riscaricherebbe il log dall'inizio o, peggio, ne salterebbe un pezzo.
    await db.execute(
      `CREATE TABLE IF NOT EXISTS sync_state (
         vault_id TEXT NOT NULL,
         key TEXT NOT NULL,
         value TEXT NOT NULL,
         PRIMARY KEY (vault_id, key)
       )`,
    );
    await db.execute(
      `CREATE TABLE IF NOT EXISTS sync_pending (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         vault_id TEXT NOT NULL,
         data BLOB NOT NULL
       )`,
    );
    // Tabella separata da `sync_state` perché lo state vector è binario: passarlo per
    // una colonna TEXT vorrebbe dire base64 all'andata e al ritorno, cioè due
    // conversioni in più e un formato da sbagliare.
    await db.execute(
      `CREATE TABLE IF NOT EXISTS sync_meta (
         vault_id TEXT NOT NULL,
         key TEXT NOT NULL,
         data BLOB NOT NULL,
         PRIMARY KEY (vault_id, key)
       )`,
    );
  }

  /**
   * Cancella ogni traccia di sync di un vault.
   *
   * Serve a chi esce da un gruppo e alla ripartenza pulita. Statica perché si usa quando
   * di quel vault non resta nulla di aperto.
   */
  static async forget(db: SqliteDatabase, vaultId: string): Promise<void> {
    await SqliteSyncStore.ensureSchema(db);
    await db.execute('DELETE FROM sync_state WHERE vault_id = ?', [vaultId]);
    await db.execute('DELETE FROM sync_pending WHERE vault_id = ?', [vaultId]);
    await db.execute('DELETE FROM sync_meta WHERE vault_id = ?', [vaultId]);
  }

  /**
   * Cancella le tracce di sync di **tutti** i vault.
   *
   * L'unico `DELETE` senza `WHERE` ammesso nel progetto, e sta qui — dentro la classe che
   * possiede queste tabelle — invece che nel chiamante: altrove il `WHERE vault_id` è ciò
   * che impedisce a un gruppo di svuotare la coda offline di un altro, ed è il solo punto
   * di tutto lo Step 12 dove un errore distrugge dati.
   *
   * Serve a «Azzera questo telefono», che di vault non ne lascia nessuno. Chiamarla a
   * motore acceso rimetterebbe in gioco proprio quel rischio: `wipeDevice` la esegue solo
   * dopo che il runtime del gruppo aperto è stato smontato.
   */
  static async forgetAll(db: SqliteDatabase): Promise<void> {
    // Come in `forget`: su un telefono che non ha mai sincronizzato queste tabelle non
    // esistono, e un `no such table` farebbe fallire un azzeramento che non ha nulla da
    // cancellare.
    await SqliteSyncStore.ensureSchema(db);
    await db.execute('DELETE FROM sync_state');
    await db.execute('DELETE FROM sync_pending');
    await db.execute('DELETE FROM sync_meta');
  }

  async getCursor(): Promise<number> {
    const rows = await this.db.query<{ value: string }>(
      'SELECT value FROM sync_state WHERE vault_id = ? AND key = ?',
      [this.vaultId, 'cursor'],
    );
    const raw = rows[0]?.value;
    const parsed = raw === undefined ? 0 : Number(raw);
    // Un valore corrotto non deve far ripartire il sync da un punto arbitrario:
    // meglio ricominciare da zero e riscaricare tutto, che è sempre sicuro.
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  }

  async setCursor(seq: number): Promise<void> {
    await this.db.execute(
      `INSERT INTO sync_state (vault_id, key, value) VALUES (?, ?, ?)
         ON CONFLICT(vault_id, key) DO UPDATE SET value = ?`,
      [this.vaultId, 'cursor', String(seq), String(seq)],
    );
  }

  async getPending(): Promise<Uint8Array[]> {
    const rows = await this.db.query<{ data: Uint8Array }>(
      'SELECT data FROM sync_pending WHERE vault_id = ? ORDER BY id ASC',
      [this.vaultId],
    );
    return rows.map((row) => toBytes(row.data));
  }

  /**
   * Scrive la coda, **una alla volta**.
   *
   * `SyncEngine.onLocalUpdate` chiama `setPending` senza `await`: due update ravvicinati
   * — due `addExpense` non racchiusi in una `transact` — intreccerebbero due `BEGIN`
   * sulla stessa connessione. Il secondo fallisce con «cannot start a transaction within
   * a transaction», e il suo `catch` esegue un `ROLLBACK` che annulla la transazione
   * **del primo**: una promessa rigettata senza gestore, e una coda su disco sbagliata.
   * Non è perdita di dati certa — il catch-up dello state vector la recupera — ma quella
   * è l'ultima rete di sicurezza, e non va sprecata su un guasto evitabile.
   *
   * La catena è **per connessione e non per vault**, contrariamente alla prima idea: la
   * transazione appartiene alla connessione, e i due store dei due gruppi la
   * condividono. Cambiando gruppo, la `setPending` ancora in volo del gruppo che si
   * chiude e la prima del gruppo che si apre sono esattamente il caso che si vuole
   * escludere.
   */
  private static readonly writeQueues = new WeakMap<SqliteDatabase, Promise<void>>();

  async setPending(updates: Uint8Array[]): Promise<void> {
    const queue = SqliteSyncStore.writeQueues.get(this.db) ?? Promise.resolve();
    const run = queue.then(() => this.writePending(updates));
    // La coda prosegue anche dopo un fallimento: l'errore lo riceve chi ha chiamato, ma
    // la scrittura successiva deve comunque partire, non restare bloccata per sempre.
    SqliteSyncStore.writeQueues.set(
      this.db,
      run.catch(() => undefined),
    );
    return run;
  }

  private async writePending(updates: Uint8Array[]): Promise<void> {
    // Riscrittura completa invece di una differenza: la coda è piccola (decine di
    // update) e la logica incrementale introdurrebbe stati intermedi in cui un crash
    // lascerebbe la coda incoerente.
    //
    // **Il `WHERE vault_id` non è un dettaglio.** Senza, questo DELETE svuoterebbe anche
    // la coda degli altri gruppi: le spese registrate offline in un gruppo sparirebbero
    // perché nel frattempo si è scritto in un altro, e nulla lo segnalerebbe. È il solo
    // punto di tutto lo Step 12 dove un errore distrugge dati, ed è coperto da un test
    // che gira su SQLite vero.
    //
    // In transazione, però: fuori da una, la finestra fra il DELETE e l'ultimo INSERT è
    // una coda **vuota** su disco. Un crash lì dentro — o la chiusura dell'app da parte
    // del sistema — farebbe sparire le spese registrate offline senza che nulla lo
    // segnali. È anche molto più veloce: un solo fsync invece di uno per riga.
    await this.db.execute('BEGIN');
    try {
      await this.db.execute('DELETE FROM sync_pending WHERE vault_id = ?', [this.vaultId]);
      for (const update of updates) {
        await this.db.execute('INSERT INTO sync_pending (vault_id, data) VALUES (?, ?)', [
          this.vaultId,
          update,
        ]);
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
      'SELECT data FROM sync_meta WHERE vault_id = ? AND key = ?',
      [this.vaultId, 'pushed_state_vector'],
    );
    const raw = rows[0]?.data;
    return raw === undefined ? null : toBytes(raw);
  }

  async setPushedStateVector(stateVector: Uint8Array): Promise<void> {
    await this.db.execute(
      `INSERT INTO sync_meta (vault_id, key, data) VALUES (?, ?, ?)
         ON CONFLICT(vault_id, key) DO UPDATE SET data = ?`,
      [this.vaultId, 'pushed_state_vector', stateVector, stateVector],
    );
  }
}

function toBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  throw new Error(`BLOB in formato non riconosciuto: ${Object.prototype.toString.call(value)}`);
}
