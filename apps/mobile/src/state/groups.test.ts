import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  deriveVaultKeys,
  SqliteYPersistence,
  VaultStore,
  type RandomSource,
  type VaultKeys,
} from '@jutrack/core';
import { MemoryKeyValueStore } from '@/platform/app-meta';
import { groupKeyStorageKey } from '@/platform/key-names';
import { SqliteSyncStore } from '@/platform/sync-store';
import { NodeSqliteDatabase } from '@/testing/sqlite';
import {
  GroupRegistry,
  normalizeGroupName,
  updatesTableName,
  MAX_GROUP_NAME,
  type RelayGateway,
} from './groups';

/**
 * Byte prevedibili ma **diversi a ogni chiamata**.
 *
 * Costanti farebbero passare un test che si aspetta due gruppi distinti pur avendone
 * generata la stessa chiave. Qui non serve entropia vera: la casualità della sorgente
 * reale è verificata nel core.
 */
const random: RandomSource = (() => {
  let counter = 0;
  return {
    getRandomBytes: (n) => {
      counter++;
      return Uint8Array.from({ length: n }, (_, i) => (counter * 37 + i * 7) & 0xff);
    },
  };
})();

/** Relay finto: registra cosa gli è stato chiesto di cancellare, e sa fallire. */
function fakeRelay() {
  const deleted: string[] = [];
  let failWith: Error | null = null;
  const gateway: RelayGateway = {
    deleteVault: async (keys: VaultKeys) => {
      if (failWith !== null) throw failWith;
      deleted.push(keys.vaultId);
    },
  };
  return {
    gateway,
    deleted,
    fail: (error: Error) => {
      failWith = error;
    },
  };
}

describe('normalizeGroupName', () => {
  it('toglie gli spazi di troppo', () => {
    expect(normalizeGroupName('  Casa   al   mare ')).toBe('Casa al mare');
  });

  it('rifiuta un nome che non contiene nulla', () => {
    expect(normalizeGroupName('')).toBeNull();
    expect(normalizeGroupName('   ')).toBeNull();
  });

  it('taglia invece di rifiutare', () => {
    expect(normalizeGroupName('a'.repeat(MAX_GROUP_NAME + 10))).toHaveLength(MAX_GROUP_NAME);
  });
});

describe('updatesTableName', () => {
  it('produce un identificatore SQL valido', () => {
    // Il vaultId è esadecimale per costruzione — derivato dalla chiave, non scelto da
    // nessuno. È la ragione per cui interpolarlo in un nome di tabella è sicuro.
    const { vaultId } = deriveVaultKeys(random.getRandomBytes(32));
    expect(updatesTableName(vaultId)).toMatch(/^y_updates_[0-9a-f]{32}$/);
  });
});

describe('GroupRegistry', () => {
  let db: NodeSqliteDatabase;
  let keyStore: MemoryKeyValueStore;
  let registry: GroupRegistry;

  beforeEach(async () => {
    db = new NodeSqliteDatabase();
    keyStore = new MemoryKeyValueStore();
    registry = await GroupRegistry.open({ db, keyStore, random });
  });

  afterEach(() => {
    db.close();
  });

  it('crea un gruppo con una chiave propria e lo sa rileggere', async () => {
    const group = await registry.create('Casa');

    expect(group.name).toBe('Casa');
    expect(group.origin).toBe('created');
    expect(group.vaultId).toMatch(/^[0-9a-f]{32}$/);
    expect(await registry.get(group.vaultId)).toEqual(group);
    expect(await registry.keyBytes(group.vaultId)).toHaveLength(32);
  });

  it('tiene più gruppi accanto, ciascuno con la sua chiave', async () => {
    // È il punto dello Step 12: entrare in un gruppo non deve più significare uscire dal
    // precedente. Prima c'era un solo slot in SecureStore e l'adozione lo sovrascriveva.
    const casa = await registry.create('Casa');
    const viaggio = await registry.create('Viaggio');

    expect(casa.vaultId).not.toBe(viaggio.vaultId);
    expect(await registry.keyBytes(casa.vaultId)).not.toEqual(
      await registry.keyBytes(viaggio.vaultId),
    );
    expect((await registry.list()).map((g) => g.name).sort()).toEqual(['Casa', 'Viaggio']);
  });

  it('la chiave derivata corrisponde al vaultId della riga', async () => {
    const group = await registry.create('Casa');
    const keys = await registry.keys(group.vaultId);
    expect(keys?.vaultId).toBe(group.vaultId);
  });

  it('entrare in un gruppo lo aggiunge invece di sostituire quelli che c erano', async () => {
    const mio = await registry.create('Casa');
    const altrui = deriveVaultKeys(random.getRandomBytes(32));
    const chiave = random.getRandomBytes(32);

    const entrato = await registry.join(chiave, 'Coinquilini');

    expect(entrato.origin).toBe('joined');
    expect(await registry.get(mio.vaultId)).not.toBeNull();
    expect(await registry.list()).toHaveLength(2);
    expect(altrui.vaultId).not.toBe(entrato.vaultId);
  });

  it('rientrare in un gruppo di cui si fa già parte non ne riscrive l origine', async () => {
    // Se un `join` su un gruppo creato qui lo marcasse `joined`, quel telefono smetterebbe
    // di seminare le categorie di default in un documento ancora vuoto — e resterebbe un
    // gruppo senza alcuna categoria.
    const chiave = random.getRandomBytes(32);
    const creato = await registry.join(chiave, 'Casa');
    await registry.rename(creato.vaultId, 'Casa nuova');

    const rientrato = await registry.join(chiave, 'Tutt altro nome');

    expect(rientrato.name).toBe('Casa nuova');
    expect(await registry.list()).toHaveLength(1);
  });

  it('rinomina aggiorna la copia locale', async () => {
    const group = await registry.create('Casa');
    await registry.rename(group.vaultId, 'Casa al mare');
    expect((await registry.get(group.vaultId))?.name).toBe('Casa al mare');
  });

  it('ricorda il membro a cui ci si è ricollegati', async () => {
    // Serve a chi ripristina il backup della chiave su un telefono nuovo: il profilo è
    // nuovo, ma dentro quel gruppo è già qualcuno. Senza, comparirebbe due volte.
    const group = await registry.create('Casa');
    expect((await registry.get(group.vaultId))?.myMemberId).toBeNull();

    await registry.setMyMemberId(group.vaultId, 'membro-di-prima');
    expect((await registry.get(group.vaultId))?.myMemberId).toBe('membro-di-prima');
  });

  it('ordina la lista dall ultimo aperto, e chi non lo è mai stato va in fondo', async () => {
    let tick = 0;
    const clock = (): Date => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++));
    const timed = await GroupRegistry.open({ db, keyStore, random, now: clock });

    const primo = await timed.create('Primo');
    const secondo = await timed.create('Secondo');
    await timed.create('Mai aperto');

    await timed.touch(primo.vaultId);
    await timed.touch(secondo.vaultId);

    expect((await timed.list()).map((g) => g.name)).toEqual(['Secondo', 'Primo', 'Mai aperto']);
  });

  it('uscire da un gruppo non tocca gli altri', async () => {
    const casa = await registry.create('Casa');
    const viaggio = await registry.create('Viaggio');

    const casaSync = await SqliteSyncStore.open(db, casa.vaultId);
    const viaggioSync = await SqliteSyncStore.open(db, viaggio.vaultId);
    await casaSync.setPending([Uint8Array.from([1])]);
    await viaggioSync.setPending([Uint8Array.from([2])]);
    await db.execute(`CREATE TABLE ${updatesTableName(casa.vaultId)} (seq INTEGER, data BLOB)`);

    await registry.forget(casa.vaultId);

    expect(await registry.get(casa.vaultId)).toBeNull();
    expect(await keyStore.get(groupKeyStorageKey(casa.vaultId))).toBeNull();
    expect(await casaSync.getPending()).toEqual([]);
    expect(await tableExists(db, updatesTableName(casa.vaultId))).toBe(false);

    // L'altro gruppo è intatto: chiave, coda e riga di registro.
    expect(await registry.get(viaggio.vaultId)).not.toBeNull();
    expect(await registry.keyBytes(viaggio.vaultId)).not.toBeNull();
    expect(await viaggioSync.getPending()).toEqual([Uint8Array.from([2])]);
  });

  it('esce anche da un gruppo mai sincronizzato', async () => {
    // Le tabelle di sync nascono all'avvio del motore: un gruppo creato e abbandonato
    // prima che sia mai partito faceva fallire l'uscita con `no such table`, e l'utente
    // restava dentro senza capire perché.
    const group = await registry.create('Mai aperto');

    await registry.forget(group.vaultId);

    expect(await registry.get(group.vaultId)).toBeNull();
  });

  it('su richiesta cancella anche la copia sul relay', async () => {
    const relay = fakeRelay();
    const withRelay = await GroupRegistry.open({ db, keyStore, random, relay: relay.gateway });
    const group = await withRelay.create('Casa');

    await withRelay.forget(group.vaultId, { wipeRelay: true });

    expect(relay.deleted).toEqual([group.vaultId]);
    expect(await withRelay.get(group.vaultId)).toBeNull();
  });

  it('non tocca il relay se non gli è stato chiesto', async () => {
    // Uscire da un gruppo che gli altri continuano a usare non deve svuotarlo per tutti.
    const relay = fakeRelay();
    const withRelay = await GroupRegistry.open({ db, keyStore, random, relay: relay.gateway });
    const group = await withRelay.create('Casa');

    await withRelay.forget(group.vaultId);

    expect(relay.deleted).toEqual([]);
  });

  it('se il relay non risponde non cancella nulla in locale', async () => {
    // L'ordine è deliberato: la cancellazione remota va autenticata con la chiave che
    // sta per essere eliminata. Cancellando prima in locale, un guasto di rete
    // lascerebbe sul relay un vault che nessuno può più cancellare — e il gruppo
    // sparirebbe da qui senza che l'utente abbia ottenuto ciò che aveva chiesto.
    const relay = fakeRelay();
    relay.fail(new Error('rete assente'));
    const withRelay = await GroupRegistry.open({ db, keyStore, random, relay: relay.gateway });
    const group = await withRelay.create('Casa');
    await db.execute(`CREATE TABLE ${updatesTableName(group.vaultId)} (seq INTEGER, data BLOB)`);

    await expect(withRelay.forget(group.vaultId, { wipeRelay: true })).rejects.toThrow(
      'rete assente',
    );

    expect(await withRelay.get(group.vaultId)).not.toBeNull();
    expect(await withRelay.keyBytes(group.vaultId)).not.toBeNull();
    expect(await tableExists(db, updatesTableName(group.vaultId))).toBe(true);
  });

  it('rifiuta di cancellare dal relay un gruppo di cui non ha più la chiave', async () => {
    // Senza chiave non c'è token, quindi il relay rifiuterebbe comunque: dirlo qui
    // lascia all'utente la scelta di uscire lo stesso, lasciando scadere la copia.
    const relay = fakeRelay();
    const withRelay = await GroupRegistry.open({ db, keyStore, random, relay: relay.gateway });
    const group = await withRelay.create('Casa');
    await keyStore.set(groupKeyStorageKey(group.vaultId), 'non-esadecimale');

    await expect(withRelay.forget(group.vaultId, { wipeRelay: true })).rejects.toThrow(
      /chiave di questo gruppo non è leggibile/,
    );
    expect(await withRelay.get(group.vaultId)).not.toBeNull();
  });

  it('tratta come assente un gruppo la cui chiave è illeggibile', async () => {
    // Proseguire con byte corrotti produrrebbe un vaultId sbagliato: un vault vuoto
    // dall'aria funzionante, e un invito che porterebbe l'altro telefono da nessuna parte.
    const group = await registry.create('Casa');
    await keyStore.set(groupKeyStorageKey(group.vaultId), 'non-esadecimale');

    expect(await registry.keyBytes(group.vaultId)).toBeNull();
    expect(await registry.keys(group.vaultId)).toBeNull();
  });

  it('restituisce null per un gruppo che non esiste', async () => {
    expect(await registry.get('f'.repeat(32))).toBeNull();
    expect(await registry.keyBytes('f'.repeat(32))).toBeNull();
  });
});

describe('GroupRegistry.regenerate', () => {
  let db: NodeSqliteDatabase;
  let keyStore: MemoryKeyValueStore;
  let registry: GroupRegistry;

  beforeEach(async () => {
    db = new NodeSqliteDatabase();
    keyStore = new MemoryKeyValueStore();
    registry = await GroupRegistry.open({ db, keyStore, random });
  });

  afterEach(() => {
    db.close();
  });

  /** Un gruppo con dentro qualcosa, salvato sulla sua tabella come nell'app vera. */
  async function groupWithData(name: string) {
    const group = await registry.create(name);
    const doc = new Y.Doc();
    const persistence = new SqliteYPersistence(db, doc, {
      tableName: updatesTableName(group.vaultId),
    });
    await persistence.load();

    const store = new VaultStore(doc, { random });
    store.setGroupName(name);
    store.setMember('membro-a', { name: 'Francesco', color: '#1971C2' });
    const category = store.addCategory({ name: 'Spesa', icon: '🛒', color: '#2B8A3E' });
    const expense = store.addExpense({
      amountCents: 1234,
      date: '2026-08-02',
      categoryId: category.id,
      paidBy: 'membro-a',
      split: { mode: 'equal', shares: { 'membro-a': 1234 } },
    });

    await persistence.destroy();
    return { group, store, expenseId: expense.id };
  }

  /** Riapre un gruppo dal database, come farebbe il runtime al montaggio. */
  async function reopen(vaultId: string): Promise<VaultStore> {
    const doc = new Y.Doc();
    const persistence = new SqliteYPersistence(db, doc, { tableName: updatesTableName(vaultId) });
    await persistence.load();
    await persistence.destroy();
    return new VaultStore(doc, { random });
  }

  it('porta spese, categorie e membri su una chiave nuova', async () => {
    const { group, store, expenseId } = await groupWithData('Casa');

    const fresh = await registry.regenerate(group.vaultId, store.encodeState());

    expect(fresh.vaultId).not.toBe(group.vaultId);
    expect(await registry.keyBytes(fresh.vaultId)).not.toEqual(
      await registry.keyBytes(group.vaultId),
    );

    const copied = await reopen(fresh.vaultId);
    expect(copied.getExpense(expenseId)?.amountCents).toBe(1234);
    expect(copied.listCategories().map((c) => c.name)).toEqual(['Spesa']);
    expect(copied.listMembers().map((m) => m.name)).toEqual(['Francesco']);
    expect(copied.getGroupName()).toBe('Casa');
  });

  it('tiene tutti i membri, escluso compreso', async () => {
    // Toglierne uno cambierebbe i saldi già calcolati: le spese lo riferiscono con
    // `paidBy` e con le quote. Chi è escluso resta nella storia, e smette solo di
    // ricevere aggiornamenti.
    const { group, store } = await groupWithData('Casa');
    store.setMember('membro-b', { name: 'Chi esce', color: '#D93A3A' });

    const fresh = await registry.regenerate(group.vaultId, store.encodeState());

    const copied = await reopen(fresh.vaultId);
    expect(
      copied
        .listMembers()
        .map((m) => m.name)
        .sort(),
    ).toEqual(['Chi esce', 'Francesco']);
  });

  it('non tocca il gruppo vecchio', async () => {
    // Uscirne è una decisione a parte: se la rigenerazione si interrompe a metà,
    // restano due gruppi leggibili invece di nessuno.
    const { group, store } = await groupWithData('Casa');

    await registry.regenerate(group.vaultId, store.encodeState());

    expect(await registry.get(group.vaultId)).not.toBeNull();
    expect(await registry.keyBytes(group.vaultId)).not.toBeNull();
    expect(await registry.list()).toHaveLength(2);
  });

  it('porta dietro il ricollegamento a un membro esistente', async () => {
    // Senza, chi era rientrato da un backup tornerebbe a essere il proprio `profileId`
    // in un documento dove esiste già con un altro id: due persone al posto di una, e
    // il saldo sbagliato — il bug dello Step 11, di ritorno dalla porta di servizio.
    const { group, store } = await groupWithData('Casa');
    await registry.setMyMemberId(group.vaultId, 'membro-a');

    const fresh = await registry.regenerate(group.vaultId, store.encodeState());

    expect(fresh.myMemberId).toBe('membro-a');
    expect((await registry.get(fresh.vaultId))?.myMemberId).toBe('membro-a');
  });

  it('tiene il nome del gruppo, o quello nuovo se glielo si dà', async () => {
    const { group, store } = await groupWithData('Casa');

    const stesso = await registry.regenerate(group.vaultId, store.encodeState());
    expect(stesso.name).toBe('Casa');

    const rinominato = await registry.regenerate(group.vaultId, store.encodeState(), 'Casa nuova');
    expect(rinominato.name).toBe('Casa nuova');
  });

  it('rifiuta un gruppo che non è nel registro', async () => {
    await expect(registry.regenerate('f'.repeat(32), new Uint8Array([0]))).rejects.toThrow(
      /non trovato/,
    );
  });
});

async function tableExists(db: NodeSqliteDatabase, name: string): Promise<boolean> {
  const rows = await db.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  );
  return rows.length > 0;
}
