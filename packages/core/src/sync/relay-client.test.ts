/**
 * Test del client del relay, sulle richieste che il motore non fa mai da solo.
 *
 * `push` e `pull` sono esercitati a fondo dai test del motore, dove contano nel loro
 * ciclo. La cancellazione del vault no: la chiede l'utente uscendo da un gruppo, una
 * volta sola, e il suo effetto sugli altri è la cosa più facile da raccontare male.
 */
import { describe, expect, it } from 'vitest';
import { deriveVaultKeys, generateVaultKey } from '../crypto/keys';
import { testRandom } from '../crypto/testing';
import { RelayClient, RelayError } from './relay-client';
import { FakeRelay } from './testing';
import type { HttpClient } from './types';

const KEYS = deriveVaultKeys(generateVaultKey(testRandom));

function makeClient(http: HttpClient) {
  return new RelayClient('https://relay.test', KEYS, http, testRandom);
}

describe('RelayClient.deleteVault', () => {
  it('cancella dal relay tutto ciò che riguarda il vault', async () => {
    const relay = new FakeRelay();
    const client = makeClient(relay);
    await client.push([Uint8Array.from([1, 2, 3])]);

    await client.deleteVault();

    expect(relay.storedCount).toBe(0);
    expect((await client.pull(0)).updates).toEqual([]);
  });

  it('chiede il vault, non gli update, e si autentica', async () => {
    // Sbagliare percorso qui significherebbe svuotare il log invece del vault, o
    // peggio non cancellare nulla riportando successo.
    const relay = new FakeRelay();
    await makeClient(relay).deleteVault();

    expect(relay.requests).toEqual([
      { method: 'DELETE', url: `https://relay.test/v1/vault/${KEYS.vaultId}/vault` },
    ]);
  });

  it('non è una revoca: il vault resta scrivibile da chi ha ancora la chiave', async () => {
    // La cancellazione azzera anche il token registrato al primo accesso, quindi il
    // `vaultId` torna libero. È la ragione per cui esiste la rigenerazione del gruppo:
    // per lasciare fuori qualcuno non basta svuotare il relay.
    const relay = new FakeRelay();
    const client = makeClient(relay);
    await client.push([Uint8Array.from([1])]);

    await client.deleteVault();
    await client.push([Uint8Array.from([2])]);

    expect(relay.storedCount).toBe(1);
  });

  it('solleva un errore fatale se il relay rifiuta il token', async () => {
    const relay = new FakeRelay();
    relay.failAllWith = { status: 403 };

    await expect(makeClient(relay).deleteVault()).rejects.toMatchObject({
      name: 'RelayError',
      status: 403,
    });
  });

  it('propaga gli errori temporanei senza confonderli con quelli definitivi', async () => {
    // Chi chiama deve poter distinguere «riprova» da «non succederà mai»: uscire da un
    // gruppo lasciando il vault sul relay è recuperabile, dirlo cancellato non lo è.
    const relay = new FakeRelay();
    relay.failAllWith = { status: 500 };

    const error = await makeClient(relay)
      .deleteVault()
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(RelayError);
    expect((error as RelayError).permanent).toBe(false);
  });
});
