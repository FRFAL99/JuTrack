/**
 * Test di contratto sulle primitive crittografiche di @noble.
 *
 * Non testa codice nostro: fissa le API di terze parti su cui poggia tutto il modello di
 * sicurezza. Se un upgrade di @noble cambia una firma o un comportamento, vogliamo che a
 * fallire sia questo file — non il sync in produzione.
 *
 * Cambiamento già incontrato: in @noble/hashes 2.x il parametro `info` di hkdf deve essere
 * Uint8Array; nella 1.x le stringhe erano accettate.
 */
import { describe, expect, it } from 'vitest';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { scrypt } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { utf8ToBytes } from '@noble/hashes/utils.js';

// utf8ToBytes di noble invece di TextEncoder: quest'ultimo richiederebbe il lib DOM,
// che porterebbe window e localStorage dentro un package che deve restare
// indipendente dalla piattaforma.
const utf8 = (s: string): Uint8Array => utf8ToBytes(s);

describe('HKDF-SHA256 — derivazione delle chiavi', () => {
  const vaultKey = new Uint8Array(32).fill(7);
  const derive = (info: string): Uint8Array => hkdf(sha256, vaultKey, undefined, utf8(info), 32);

  it('produce una chiave di 32 byte', () => {
    expect(derive('jutrack/content/v1')).toHaveLength(32);
  });

  it('separa i domini: info diverse producono chiavi diverse', () => {
    // È la proprietà che consente al relay di vedere authKey senza ottenere
    // alcun vantaggio verso contentKey.
    expect(derive('jutrack/content/v1')).not.toEqual(derive('jutrack/auth/v1'));
  });

  it('è deterministica: stessa chiave e stessa info danno lo stesso risultato', () => {
    // Necessaria perché due dispositivi derivino le stesse chiavi dalla stessa vaultKey.
    expect(derive('jutrack/content/v1')).toEqual(derive('jutrack/content/v1'));
  });

  it('richiede Uint8Array per info, non una stringa', () => {
    // @ts-expect-error — verifica che la 2.x rifiuti davvero le stringhe
    expect(() => hkdf(sha256, vaultKey, undefined, 'jutrack/content/v1', 32)).toThrow(TypeError);
  });
});

describe('XChaCha20-Poly1305 — cifratura autenticata', () => {
  const key = new Uint8Array(32).fill(3);
  const aad = utf8('vault-abc');
  const plaintext = utf8('spesa: 1230 centesimi');

  it('usa un nonce da 24 byte e aggiunge un tag da 16 byte', () => {
    // 24 byte di nonce permettono la generazione casuale senza coordinamento
    // tra dispositivi: la probabilità di collisione su 192 bit è trascurabile.
    const nonce = randomBytes(24);
    const ct = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
    expect(nonce).toHaveLength(24);
    expect(ct).toHaveLength(plaintext.length + 16);
  });

  it('fa il round-trip del plaintext', () => {
    const nonce = randomBytes(24);
    const ct = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
    expect(xchacha20poly1305(key, nonce, aad).decrypt(ct)).toEqual(plaintext);
  });

  it('produce ciphertext diversi per lo stesso plaintext (nonce distinti)', () => {
    const a = xchacha20poly1305(key, randomBytes(24), aad).encrypt(plaintext);
    const b = xchacha20poly1305(key, randomBytes(24), aad).encrypt(plaintext);
    expect(a).not.toEqual(b);
  });

  it('respinge un ciphertext manomesso anche di un solo bit', () => {
    // Garanzia 2 del threat model: il relay non può alterare i dati inosservato.
    const nonce = randomBytes(24);
    const ct = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
    const tampered = Uint8Array.from(ct);
    tampered.set([(ct[0] ?? 0) ^ 0x01], 0);
    expect(() => xchacha20poly1305(key, nonce, aad).decrypt(tampered)).toThrow();
  });

  it('respinge una AAD diversa da quella usata in cifratura', () => {
    // Lega ogni blob al proprio vault: un blob spostato su un altro vaultId non decifra.
    const nonce = randomBytes(24);
    const ct = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
    expect(() => xchacha20poly1305(key, nonce, utf8('vault-XXX')).decrypt(ct)).toThrow();
  });

  it('respinge una chiave errata', () => {
    const nonce = randomBytes(24);
    const ct = xchacha20poly1305(key, nonce, aad).encrypt(plaintext);
    const wrongKey = new Uint8Array(32).fill(9);
    expect(() => xchacha20poly1305(wrongKey, nonce, aad).decrypt(ct)).toThrow();
  });
});

describe('scrypt — solo per il backup protetto da passphrase', () => {
  it('deriva 32 byte ed è deterministica a parità di salt', () => {
    const passphrase = utf8('passphrase-di-prova');
    const salt = new Uint8Array(16).fill(1);
    // N ridotto per tenere veloce il test; i parametri reali sono in crypto/backup.
    const params = { N: 2 ** 12, r: 8, p: 1, dkLen: 32 } as const;
    const a = scrypt(passphrase, salt, params);
    expect(a).toHaveLength(32);
    expect(a).toEqual(scrypt(passphrase, salt, params));
  });

  it('produce chiavi diverse con salt diversi', () => {
    const passphrase = utf8('passphrase-di-prova');
    const params = { N: 2 ** 12, r: 8, p: 1, dkLen: 32 } as const;
    const a = scrypt(passphrase, new Uint8Array(16).fill(1), params);
    const b = scrypt(passphrase, new Uint8Array(16).fill(2), params);
    expect(a).not.toEqual(b);
  });
});
