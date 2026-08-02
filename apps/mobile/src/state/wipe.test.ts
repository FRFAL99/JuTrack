import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RandomSource, VaultKeys } from '@jutrack/core';
import { MemoryKeyValueStore, SqliteAppMeta } from '@/platform/app-meta';
import { groupKeyStorageKey } from '@/platform/key-names';
import { SqliteSyncStore } from '@/platform/sync-store';
import { NodeSqliteDatabase } from '@/testing/sqlite';
import { GroupRegistry, updatesTableName, type RelayGateway } from './groups';
import { saveProfile } from './profile';
import { ensureSchema } from './schema';
import { wipeDevice } from './wipe';

/**
 * Un keystore che sa fallire su uno slot preciso.
 *
 * È il modo di interrompere l'azzeramento **a metà**, che è il caso da cui dipende tutta
 * la scelta dell'ordine: se un `forget` fallisce, ciò che resta dev'essere uno stato che
 * l'app sa già disegnare.
 */
class FlakyKeyStore extends MemoryKeyValueStore {
  failOn: string | null = null;

  override async delete(key: string): Promise<void> {
    if (key === this.failOn) throw new Error('portachiavi di sistema non disponibile');
    await super.delete(key);
  }
}

/** Byte prevedibili ma diversi a ogni chiamata, come in `groups.test.ts`. */
const random: RandomSource = (() => {
  let counter = 0;
  return {
    getRandomBytes: (n) => {
      counter++;
      return Uint8Array.from({ length: n }, (_, i) => (counter * 53 + i * 11) & 0xff);
    },
  };
})();

/**
 * L'azzeramento, su SQLite vero.
 *
 * Le domande sono «questa tabella esiste ancora?» e «questa riga è sparita?»: a quelle
 * risponde solo un motore che le tabelle le crea davvero.
 */
describe('wipeDevice', () => {
  let db: NodeSqliteDatabase;
  let meta: SqliteAppMeta;
  let keyStore: FlakyKeyStore;
  let registry: GroupRegistry;
  let deletedFromRelay: string[];

  beforeEach(async () => {
    db = new NodeSqliteDatabase();
    meta = await SqliteAppMeta.open(db);
    keyStore = new FlakyKeyStore();
    deletedFromRelay = [];
    const relay: RelayGateway = {
      deleteVault: async (keys: VaultKeys) => {
        deletedFromRelay.push(keys.vaultId);
      },
    };
    registry = await GroupRegistry.open({ db, keyStore, random, relay });
    await ensureSchema(db, meta, keyStore);
    await saveProfile(meta, { profileId: 'io', name: 'Francesco', color: '#3B5BDB' });
  });

  afterEach(() => {
    db.close();
  });

  /** Un gruppo con addosso tutto ciò che un gruppo vero si porta dietro. */
  async function groupWithData(name: string) {
    const group = await registry.create(name);
    const sync = await SqliteSyncStore.open(db, group.vaultId);
    await sync.setCursor(7);
    await sync.setPending([Uint8Array.from([1, 2, 3])]);
    await sync.setPushedStateVector(Uint8Array.from([4, 5]));
    await db.execute(
      `CREATE TABLE ${updatesTableName(group.vaultId)} (seq INTEGER PRIMARY KEY, data BLOB)`,
    );
    return group;
  }

  it('cancella chiavi, tabelle e profilo di due gruppi', async () => {
    const casa = await groupWithData('Casa');
    const viaggio = await groupWithData('Viaggio');

    expect(await wipeDevice({ db, meta, keyStore, registry })).toEqual({ groupsRemoved: 2 });

    expect(await registry.list()).toEqual([]);
    for (const group of [casa, viaggio]) {
      expect(await keyStore.get(groupKeyStorageKey(group.vaultId))).toBeNull();
      expect(await tableExists(db, updatesTableName(group.vaultId))).toBe(false);
    }
    expect(await meta.get('profile')).toBeNull();
  });

  it('non lascia tabelle y_updates orfane', async () => {
    // Un tentativo interrotto ieri: la tabella di persistenza è rimasta, la riga di
    // registro no — quindi nessun `forget` la nominerà mai più. L'azzeramento è anche una
    // riparazione, non solo una cancellazione.
    const orfana = updatesTableName('a'.repeat(32));
    await db.execute(`CREATE TABLE ${orfana} (seq INTEGER PRIMARY KEY, data BLOB)`);
    await groupWithData('Casa');

    await wipeDevice({ db, meta, keyStore, registry });

    expect(await tableExists(db, orfana)).toBe(false);
  });

  it('azzera anche le righe di sync di ogni vault', async () => {
    const casa = await groupWithData('Casa');
    // Righe di un gruppo che dal registro è già sparito: `forget` non passerà di qui,
    // perché non ha più un `vaultId` da cui partire.
    const fantasma = await SqliteSyncStore.open(db, 'b'.repeat(32));
    await fantasma.setPending([Uint8Array.from([9])]);

    await wipeDevice({ db, meta, keyStore, registry });

    for (const table of ['sync_state', 'sync_pending', 'sync_meta']) {
      expect(await survivingRows(db, table)).toBe(0);
    }
    expect(await (await SqliteSyncStore.open(db, casa.vaultId)).getCursor()).toBe(0);
  });

  it('non chiede nulla al relay', async () => {
    // Azzerare è un gesto **locale**. Le copie sul relay sono cifrate, scadono da sole dopo
    // trenta giorni, e cancellarle riguarda tutti gli altri: chi le vuole via esce da ogni
    // gruppo con l'interruttore apposito, prima.
    await groupWithData('Casa');
    await groupWithData('Viaggio');

    await wipeDevice({ db, meta, keyStore, registry });

    expect(deletedFromRelay).toEqual([]);
  });

  it('lascia lo schema alla versione corrente', async () => {
    // `DELETE FROM app_meta` porta via anche `schema_version`, e qui non si riavvia l'app:
    // senza il ripristino, il prossimo avvio non saprebbe più a che schema è.
    await groupWithData('Casa');

    await wipeDevice({ db, meta, keyStore, registry });

    expect(await meta.get('schema_version')).toBe('2');
  });

  it('un interruzione a metà lascia uno stato coerente', async () => {
    await groupWithData('Casa');
    await groupWithData('Viaggio');
    // L'ordine si legge dal registro invece di darlo per scontato: è quello che seguirà
    // anche `wipeDevice`, e con due gruppi creati nello stesso millisecondo non è ovvio.
    const [primo, secondo] = (await registry.list()).map((g) => g.vaultId);
    if (primo === undefined || secondo === undefined) throw new Error('servono due gruppi');

    keyStore.failOn = groupKeyStorageKey(secondo);
    await expect(wipeDevice({ db, meta, keyStore, registry })).rejects.toThrow(
      /Azzeramento incompleto/,
    );

    // Il primo è sparito del tutto; il secondo è intatto, riga di registro compresa. E il
    // profilo c'è ancora: ogni prefisso interrotto è «profilo presente, un gruppo in meno»,
    // che è uno stato normale dell'app — non uno da cui si esce solo reinstallando.
    expect(await registry.get(primo)).toBeNull();
    expect(await tableExists(db, updatesTableName(primo))).toBe(false);
    expect(await registry.get(secondo)).not.toBeNull();
    expect(await meta.get('profile')).toContain('Francesco');

    // E rieseguendo si conclude: il gruppo rimasto è ancora in elenco, quindi la sua
    // chiave è ancora nominabile. È tutto il senso di leggere la lista per prima.
    keyStore.failOn = null;
    expect(await wipeDevice({ db, meta, keyStore, registry })).toEqual({ groupsRemoved: 1 });
    expect(await registry.list()).toEqual([]);
    expect(await meta.get('profile')).toBeNull();
  });

  it('su un telefono senza gruppi non solleva', async () => {
    // Mai sincronizzato: le tabelle di sync non esistono ancora, ed è il `no such table`
    // già visto una volta uscendo da un gruppo appena creato.
    expect(await wipeDevice({ db, meta, keyStore, registry })).toEqual({ groupsRemoved: 0 });
    expect(await meta.get('profile')).toBeNull();
  });
});

async function tableExists(db: NodeSqliteDatabase, name: string): Promise<boolean> {
  const rows = await db.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  );
  return rows.length > 0;
}

/**
 * Quante righe sono sopravvissute in una tabella — **zero anche se la tabella non c'è
 * più**.
 *
 * Non è indulgenza: le tabelle di sync portano gli stessi nomi dello schema a vault unico,
 * quindi l'`ensureSchema` finale, che non trova più alcuna versione registrata, le prende
 * per vecchie e le elimina. Sono vuote da un istante prima, e `SqliteSyncStore.open` le
 * ricrea alla prima apertura di un gruppo. La domanda del test è «è sopravvissuto
 * qualcosa?», e a quella la risposta è la stessa nei due casi.
 */
async function survivingRows(db: NodeSqliteDatabase, table: string): Promise<number> {
  if (!(await tableExists(db, table))) return 0;
  const rows = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return rows[0]?.n ?? 0;
}
