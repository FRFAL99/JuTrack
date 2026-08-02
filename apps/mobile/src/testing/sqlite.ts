import { DatabaseSync } from 'node:sqlite';
import type { SqlValue, SqliteDatabase } from '@jutrack/core';

/**
 * `SqliteDatabase` su SQLite **vero**, per i test in Node.
 *
 * Solo per i test: nulla dell'app importa questo file, e su React Native `node:sqlite`
 * non esiste. In produzione il database è `ExpoSqliteDatabase`.
 *
 * Esiste al posto di `MemoryDatabase` — che riconosce per espressione regolare le sole
 * istruzioni di `SqliteYPersistence` — perché la cosa da verificare qui è il **SQL**. Un
 * finto motore che ignori il `WHERE vault_id` di `setPending` lascerebbe passare
 * esattamente il bug che quel `WHERE` esiste per evitare: la coda offline di un gruppo
 * cancellata da una scrittura in un altro. Un motore vero non può mentire su questo.
 */
export class NodeSqliteDatabase implements SqliteDatabase {
  private readonly db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(':memory:');
  }

  async execute(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    // `BEGIN`/`COMMIT`/`ROLLBACK` e il DDL non hanno binding: `exec` è la via diretta.
    if (params.length === 0) {
      this.db.exec(sql);
      return;
    }
    this.db.prepare(sql).run(...params);
  }

  async query<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  close(): void {
    this.db.close();
  }
}
