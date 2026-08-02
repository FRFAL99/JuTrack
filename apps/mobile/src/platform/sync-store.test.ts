import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteSyncStore } from '@/platform/sync-store';
import { NodeSqliteDatabase } from '@/testing/sqlite';

/**
 * Il cursore e la coda di invio, con **due gruppi nello stesso database**.
 *
 * Gira su SQLite vero e non su un finto motore: la cosa da verificare è il SQL. Un
 * `DELETE FROM sync_pending` senza `WHERE vault_id` passerebbe qualunque test scritto
 * contro un motore finto che non implementa il `WHERE` — ed è il solo errore dello
 * Step 12 che distrugge dati invece di limitarsi a rompere qualcosa.
 */
describe('SqliteSyncStore con più vault', () => {
  const VAULT_A = 'a'.repeat(32);
  const VAULT_B = 'b'.repeat(32);

  let db: NodeSqliteDatabase;
  let a: SqliteSyncStore;
  let b: SqliteSyncStore;

  beforeEach(async () => {
    db = new NodeSqliteDatabase();
    a = await SqliteSyncStore.open(db, VAULT_A);
    b = await SqliteSyncStore.open(db, VAULT_B);
  });

  afterEach(() => {
    db.close();
  });

  it('non cancella la coda di un gruppo scrivendo in un altro', async () => {
    // Lo scenario reale: una spesa registrata offline nel gruppo A resta in coda, poi si
    // apre il gruppo B e ci si scrive qualcosa. Senza `WHERE vault_id`, la scrittura su B
    // svuoterebbe la coda di A e quella spesa non arriverebbe mai al relay.
    await a.setPending([bytes(1, 2, 3), bytes(4, 5)]);
    await b.setPending([bytes(9)]);

    expect(await a.getPending()).toEqual([bytes(1, 2, 3), bytes(4, 5)]);
    expect(await b.getPending()).toEqual([bytes(9)]);
  });

  it('svuotare la coda di un gruppo lascia intatta quella dell’altro', async () => {
    await a.setPending([bytes(1)]);
    await b.setPending([bytes(2)]);

    await b.setPending([]);

    expect(await a.getPending()).toEqual([bytes(1)]);
    expect(await b.getPending()).toEqual([]);
  });

  it('tiene un cursore per gruppo', async () => {
    await a.setCursor(17);
    await b.setCursor(3);

    expect(await a.getCursor()).toBe(17);
    expect(await b.getCursor()).toBe(3);
  });

  it('aggiornare il cursore di un gruppo non tocca quello dell’altro', async () => {
    // Con la sola `key` come chiave primaria questo INSERT … ON CONFLICT sovrascriverebbe
    // la riga dell'altro gruppo, che poi riscaricherebbe il log dall'inizio — o, se il
    // cursore fosse più avanti del suo, ne salterebbe un pezzo in silenzio.
    await a.setCursor(50);
    await b.setCursor(1);
    await a.setCursor(51);

    expect(await b.getCursor()).toBe(1);
    expect(await a.getCursor()).toBe(51);
  });

  it('tiene uno state vector per gruppo', async () => {
    await a.setPushedStateVector(bytes(1, 1));
    await b.setPushedStateVector(bytes(2, 2));

    expect(await a.getPushedStateVector()).toEqual(bytes(1, 1));
    expect(await b.getPushedStateVector()).toEqual(bytes(2, 2));
  });

  it('parte da zero e da vuoto per un gruppo mai sincronizzato', async () => {
    expect(await a.getCursor()).toBe(0);
    expect(await a.getPending()).toEqual([]);
    expect(await a.getPushedStateVector()).toBeNull();
  });

  it('conserva l’ordine della coda, che è quello di creazione degli update', async () => {
    await a.setPending([bytes(1), bytes(2), bytes(3)]);
    expect(await a.getPending()).toEqual([bytes(1), bytes(2), bytes(3)]);
  });

  it('dimenticare un gruppo cancella solo le sue righe', async () => {
    await a.setPending([bytes(1)]);
    await a.setCursor(9);
    await a.setPushedStateVector(bytes(7));
    await b.setPending([bytes(2)]);
    await b.setCursor(4);
    await b.setPushedStateVector(bytes(8));

    await SqliteSyncStore.forget(db, VAULT_A);

    expect(await a.getPending()).toEqual([]);
    expect(await a.getCursor()).toBe(0);
    expect(await a.getPushedStateVector()).toBeNull();
    expect(await b.getPending()).toEqual([bytes(2)]);
    expect(await b.getCursor()).toBe(4);
    expect(await b.getPushedStateVector()).toEqual(bytes(8));
  });

  it('due scritture della coda avviate insieme non si accavallano', async () => {
    // `SyncEngine.onLocalUpdate` chiama `setPending` **senza `await`**: due spese
    // registrate una dopo l'altra partono insieme. Senza serializzazione i due `BEGIN` si
    // intrecciano sulla stessa connessione, il secondo fallisce con «cannot start a
    // transaction within a transaction» e il suo `ROLLBACK` annulla la transazione del
    // primo — una promessa rigettata senza gestore, e una coda su disco sbagliata.
    await Promise.all([a.setPending([bytes(1)]), a.setPending([bytes(1), bytes(2)])]);

    expect(await a.getPending()).toEqual([bytes(1), bytes(2)]);
  });

  it('nemmeno se arrivano da due gruppi diversi', async () => {
    // La transazione appartiene alla **connessione**, non al vault: la `setPending`
    // ancora in volo del gruppo che si chiude e la prima del gruppo che si apre sono
    // sulla stessa connessione, ed è esattamente ciò che capita cambiando gruppo.
    await Promise.all([a.setPending([bytes(1), bytes(2)]), b.setPending([bytes(9)])]);

    expect(await a.getPending()).toEqual([bytes(1), bytes(2)]);
    expect(await b.getPending()).toEqual([bytes(9)]);
  });

  it('riapre lo stesso stato dopo una riapertura del gruppo', async () => {
    await a.setPending([bytes(42)]);
    await a.setCursor(12);

    const reopened = await SqliteSyncStore.open(db, VAULT_A);

    expect(await reopened.getPending()).toEqual([bytes(42)]);
    expect(await reopened.getCursor()).toBe(12);
  });
});

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}
