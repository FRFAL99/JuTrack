import { describe, expect, it } from 'vitest';
import { BACKUP_PREFIX, exportBackup, importBackup, type ScryptParams } from './backup';
import { deriveVaultKeys, generateVaultKey } from './keys';
import { fixedRandom, testRandom } from './testing';
import { bytesToBase64url } from './encoding';

// Costo ridotto: i test verificano la logica del formato, non la robustezza del KDF.
// Con il default logN=16 ogni test impiegherebbe centinaia di millisecondi.
const fast: ScryptParams = { logN: 12, r: 8, p: 1 };

const vaultKey = generateVaultKey(fixedRandom());
const PASSPHRASE = 'cavallo-batteria-graffetta-corretto';

describe('exportBackup / importBackup', () => {
  it('fa il round-trip della chiave del vault', async () => {
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    expect(await importBackup(backup, PASSPHRASE)).toEqual(vaultKey);
  });

  it('la chiave ripristinata deriva lo stesso vault', async () => {
    // È ciò che conta davvero per l'utente: dopo un ripristino deve ritrovare
    // i propri dati, non un vault nuovo e vuoto.
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    const restored = await importBackup(backup, PASSPHRASE);
    expect(deriveVaultKeys(restored)).toEqual(deriveVaultKeys(vaultKey));
  });

  it('usa il prefisso riconoscibile', async () => {
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    expect(backup.startsWith(BACKUP_PREFIX)).toBe(true);
  });

  it('produce backup diversi a ogni export (salt e nonce nuovi)', async () => {
    const a = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    const b = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    expect(a).not.toBe(b);
    // ...ma entrambi devono ripristinare la stessa chiave.
    expect(await importBackup(a, PASSPHRASE)).toEqual(await importBackup(b, PASSPHRASE));
  });

  it('non contiene la chiave in chiaro', async () => {
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    expect(backup).not.toContain(bytesToBase64url(vaultKey));
  });

  it('tollera spazi accidentali attorno al backup', async () => {
    // Un copia-incolla da una nota o da un messaggio porta spesso spazi o a capo.
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    expect(await importBackup(`\n  ${backup}  \n`, PASSPHRASE)).toEqual(vaultKey);
  });

  it('accetta passphrase equivalenti in forme Unicode diverse', async () => {
    // "è" può essere un codepoint singolo o "e" + accento combinante: senza
    // normalizzazione NFKC la stessa passphrase digitata su due tastiere fallirebbe.
    const composed = 'caffè-perfetto';
    const decomposed = 'caffè-perfetto';
    const backup = await exportBackup(vaultKey, composed, testRandom, fast);
    expect(await importBackup(backup, decomposed)).toEqual(vaultKey);
  });

  it('rifiuta una passphrase vuota', async () => {
    await expect(exportBackup(vaultKey, '', testRandom, fast)).rejects.toThrow(
      /non può essere vuota/,
    );
  });

  it('rifiuta una chiave di lunghezza errata', async () => {
    await expect(exportBackup(new Uint8Array(16), PASSPHRASE, testRandom, fast)).rejects.toThrow(
      /attesi 32 byte/,
    );
  });
});

describe('importBackup — input non validi', () => {
  it('rifiuta la passphrase sbagliata con un messaggio comprensibile', async () => {
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    await expect(importBackup(backup, 'passphrase-sbagliata')).rejects.toThrow(/passphrase errata/);
  });

  it('rifiuta una stringa senza prefisso', async () => {
    await expect(importBackup('non-un-backup', PASSPHRASE)).rejects.toThrow(/manca il prefisso/);
  });

  it('rifiuta un backup di lunghezza sbagliata', async () => {
    await expect(importBackup(`${BACKUP_PREFIX}AAAA`, PASSPHRASE)).rejects.toThrow(/malformato/);
  });

  it('rifiuta caratteri non validi nel base64url', async () => {
    await expect(importBackup(`${BACKUP_PREFIX}!!!!`, PASSPHRASE)).rejects.toThrow(
      /base64url non valido/,
    );
  });

  it('rifiuta parametri scrypt fuori intervallo', async () => {
    // Un logN assurdo farebbe allocare gigabyte di memoria durante la derivazione.
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    const bytes = Buffer.from(backup.slice(BACKUP_PREFIX.length), 'base64url');
    bytes[1] = 40; // logN = 40 → 2^40 byte
    const tampered = BACKUP_PREFIX + bytes.toString('base64url');
    await expect(importBackup(tampered, PASSPHRASE)).rejects.toThrow(/fuori intervallo/);
  });

  it('rifiuta un backup con ciphertext manomesso', async () => {
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, fast);
    const bytes = Buffer.from(backup.slice(BACKUP_PREFIX.length), 'base64url');
    const last = bytes.length - 1;
    bytes[last] = (bytes[last] ?? 0) ^ 0x01;
    const tampered = BACKUP_PREFIX + bytes.toString('base64url');
    await expect(importBackup(tampered, PASSPHRASE)).rejects.toThrow(/passphrase errata/);
  });

  it('rifiuta un abbassamento dei parametri scrypt', async () => {
    // I parametri sono nella AAD: chi intercetta un backup non può riscriverli
    // per rendere banale un attacco a forza bruta sulla passphrase.
    const backup = await exportBackup(vaultKey, PASSPHRASE, testRandom, { logN: 14, r: 8, p: 1 });
    const bytes = Buffer.from(backup.slice(BACKUP_PREFIX.length), 'base64url');
    bytes[1] = 12; // logN abbassato da 14 a 12
    const tampered = BACKUP_PREFIX + bytes.toString('base64url');
    await expect(importBackup(tampered, PASSPHRASE)).rejects.toThrow(/passphrase errata/);
  });
});
