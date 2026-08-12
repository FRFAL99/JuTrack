import * as SQLite from 'expo-sqlite';
import type { SqlValue, SqliteDatabase } from '@jutrack/core';

/**
 * Adattatore da `expo-sqlite` all'interfaccia `SqliteDatabase` del core.
 *
 * expo-sqlite gestisce i BLOB come `Uint8Array` in entrambe le direzioni, che è
 * esattamente il formato degli update binari di Yjs: nessuna conversione necessaria.
 */
export class ExpoSqliteDatabase implements SqliteDatabase {
  private constructor(private readonly db: SQLite.SQLiteDatabase) {}

  /**
   * Apre il database.
   *
   * `isolated` esiste per il solo task headless del widget (Step 34). Senza
   * `useNewConnection`, expo-sqlite **riusa la connessione nativa già aperta** per lo stesso
   * file: il task può partire mentre l'app gira, nello stesso runtime JS, e la sua `close()`
   * chiuderebbe il database sotto i piedi all'app. Con una connessione propria chiude la
   * sua e basta. Legge e non scrive, quindi in WAL non dà fastidio a nessuno.
   */
  static async open(
    name = 'jutrack.db',
    { isolated = false }: { isolated?: boolean } = {},
  ): Promise<ExpoSqliteDatabase> {
    const db = await SQLite.openDatabaseAsync(name, isolated ? { useNewConnection: true } : {});
    // WAL: letture e scritture concorrenti senza bloccarsi a vicenda. Senza, il
    // salvataggio di una spesa può far attendere il rendering della lista.
    await db.execAsync('PRAGMA journal_mode = WAL;');
    return new ExpoSqliteDatabase(db);
  }

  // `[...params]` e non un cast: `SqlValue` è già un sottoinsieme di `SQLiteBindValue`
  // (che include `Uint8Array` fra i tipi BLOB), serve solo a passare da readonly a
  // mutabile. Un cast avrebbe potuto nascondere una futura incompatibilità reale.
  async execute(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    await this.db.runAsync(sql, [...params]);
  }

  async query<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, [...params]);
  }

  /** Chiude il database. Da chiamare solo quando nulla lo sta più usando. */
  async close(): Promise<void> {
    await this.db.closeAsync();
  }
}
