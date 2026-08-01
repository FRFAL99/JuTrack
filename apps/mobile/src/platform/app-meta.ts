import type { SqliteDatabase } from '@jutrack/core';

/**
 * Archivio chiave/valore per le impostazioni **del dispositivo**, non del vault.
 *
 * Ci vive il profilo: chi sono io su questo telefono. Sta qui e non in SecureStore per
 * una ragione di igiene — SecureStore resta riservato al materiale crittografico, e un
 * nome scelto dall'utente non lo è. Sta qui e non nel `Y.Doc` perché non va sincronizzato:
 * è la sola cosa che distingue questo telefono dall'altro.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class SqliteAppMeta implements KeyValueStore {
  private constructor(private readonly db: SqliteDatabase) {}

  static async open(db: SqliteDatabase): Promise<SqliteAppMeta> {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS app_meta (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    );
    return new SqliteAppMeta(db);
  }

  async get(key: string): Promise<string | null> {
    const rows = await this.db.query<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      [key],
    );
    return rows[0]?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.execute(
      'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
      [key, value, value],
    );
  }

  async delete(key: string): Promise<void> {
    await this.db.execute('DELETE FROM app_meta WHERE key = ?', [key]);
  }
}

/** `KeyValueStore` in memoria, per i test. */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}
