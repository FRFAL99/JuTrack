import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SecureKeyStore } from '@jutrack/core';
import { MemoryKeyValueStore, SqliteAppMeta } from '@/platform/app-meta';
import { LEGACY_VAULT_KEY_STORAGE_KEY } from '@/platform/key-names';
import { NodeSqliteDatabase } from '@/testing/sqlite';
import { ensureSchema } from './schema';

/**
 * La ripartenza pulita.
 *
 * Su SQLite vero perché la domanda è «esiste questa tabella?», e a quella risponde solo
 * un motore che le tabelle le crea davvero.
 */
describe('ensureSchema', () => {
  let db: NodeSqliteDatabase;
  let meta: SqliteAppMeta;
  let keyStore: SecureKeyStore;

  beforeEach(async () => {
    db = new NodeSqliteDatabase();
    meta = await SqliteAppMeta.open(db);
    keyStore = new MemoryKeyValueStore();
  });

  afterEach(() => {
    db.close();
  });

  it('su un telefono nuovo non cancella nulla e registra la versione', async () => {
    expect(await ensureSchema(db, meta, keyStore)).toEqual({ wiped: false });
    expect(await meta.get('schema_version')).toBe('2');
  });

  it('elimina lo schema a vault unico e la chiave che ci stava attaccata', async () => {
    await installLegacySchema(db, keyStore);

    expect(await ensureSchema(db, meta, keyStore)).toEqual({ wiped: true });

    for (const table of ['y_updates', 'sync_state', 'sync_pending', 'sync_meta']) {
      expect(await tableExists(db, table)).toBe(false);
    }
    expect(await keyStore.get(LEGACY_VAULT_KEY_STORAGE_KEY)).toBeNull();
  });

  it('non cancella il profilo', async () => {
    // Il profilo non ha nulla a che vedere con lo schema del vault: azzerarlo
    // costringerebbe a rifare l'onboarding senza alcun motivo.
    await installLegacySchema(db, keyStore);
    await meta.set('profile', '{"profileId":"abc","name":"Francesco","color":"#3B5BDB"}');

    await ensureSchema(db, meta, keyStore);

    expect(await meta.get('profile')).toContain('Francesco');
  });

  it('elimina le chiavi di app_meta riferite al vecchio vault', async () => {
    await installLegacySchema(db, keyStore);
    await meta.set('vault_origin:vecchio', 'created');
    await meta.set('my_member_id:vecchio', 'membro');

    await ensureSchema(db, meta, keyStore);

    expect(await meta.get('vault_origin:vecchio')).toBeNull();
    expect(await meta.get('my_member_id:vecchio')).toBeNull();
  });

  it('è idempotente: al secondo avvio non fa più nulla', async () => {
    await installLegacySchema(db, keyStore);

    expect((await ensureSchema(db, meta, keyStore)).wiped).toBe(true);
    expect((await ensureSchema(db, meta, keyStore)).wiped).toBe(false);
  });

  it('non tocca le tabelle del nuovo schema', async () => {
    // Se un giorno arriverà uno schema 3, il wipe dovrà riguardare le tabelle di allora:
    // qui si verifica che quelle nuove sopravvivano al passaggio 1 → 2.
    await installLegacySchema(db, keyStore);
    await db.execute('CREATE TABLE groups (vault_id TEXT PRIMARY KEY, name TEXT NOT NULL)');
    await db.execute("INSERT INTO groups VALUES ('abc', 'Casa')");

    await ensureSchema(db, meta, keyStore);

    expect(await tableExists(db, 'groups')).toBe(true);
    expect(await db.query('SELECT * FROM groups')).toHaveLength(1);
  });
});

/** Lo schema di prima dei gruppi: tabelle senza `vault_id`, chiave nello slot unico. */
async function installLegacySchema(db: NodeSqliteDatabase, keyStore: SecureKeyStore) {
  await db.execute('CREATE TABLE y_updates (seq INTEGER PRIMARY KEY AUTOINCREMENT, data BLOB)');
  await db.execute('CREATE TABLE sync_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  await db.execute(
    'CREATE TABLE sync_pending (id INTEGER PRIMARY KEY AUTOINCREMENT, data BLOB NOT NULL)',
  );
  await db.execute('CREATE TABLE sync_meta (key TEXT PRIMARY KEY, data BLOB NOT NULL)');
  await keyStore.set(LEGACY_VAULT_KEY_STORAGE_KEY, 'ab'.repeat(32));
}

async function tableExists(db: NodeSqliteDatabase, name: string): Promise<boolean> {
  const rows = await db.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  );
  return rows.length > 0;
}
