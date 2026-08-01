import { describe, expect, it } from 'vitest';
import {
  assertVaultKey,
  authToken,
  deriveVaultKeys,
  generateVaultKey,
  secretsMatch,
  VAULT_KEY_BYTES,
} from './keys';
import { fixedRandom, shortRandom, testRandom } from './testing';

describe('generateVaultKey', () => {
  it('produce una chiave di 32 byte', () => {
    expect(generateVaultKey(testRandom)).toHaveLength(VAULT_KEY_BYTES);
  });

  it('produce chiavi diverse a ogni chiamata', () => {
    expect(generateVaultKey(testRandom)).not.toEqual(generateVaultKey(testRandom));
  });

  it('fallisce rumorosamente se la RandomSource restituisce meno byte del richiesto', () => {
    // Una sorgente difettosa che degrada in silenzio produrrebbe chiavi deboli
    // senza che nulla lo segnali.
    expect(() => generateVaultKey(shortRandom)).toThrow(/31 byte invece di 32/);
  });
});

describe('deriveVaultKeys', () => {
  const vaultKey = generateVaultKey(fixedRandom());

  it('è deterministica: i due dispositivi derivano le stesse chiavi', () => {
    // È la proprietà su cui si regge tutto il pairing: il telefono B riceve solo la
    // vaultKey e deve arrivare esattamente allo stesso vaultId e alle stesse chiavi.
    expect(deriveVaultKeys(vaultKey)).toEqual(deriveVaultKeys(vaultKey));
  });

  it('separa i domini: contentKey e authKey sono diverse', () => {
    const { contentKey, authKey } = deriveVaultKeys(vaultKey);
    expect(contentKey).not.toEqual(authKey);
  });

  it('non espone la vaultKey in nessuna chiave derivata', () => {
    // Se una derivata coincidesse con la radice, il relay che vede authKey
    // otterrebbe la chiave di cifratura.
    const { contentKey, authKey } = deriveVaultKeys(vaultKey);
    expect(contentKey).not.toEqual(vaultKey);
    expect(authKey).not.toEqual(vaultKey);
  });

  it('produce un vaultId esadecimale di 32 caratteri', () => {
    expect(deriveVaultKeys(vaultKey).vaultId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('produce vaultId diversi da chiavi diverse', () => {
    const other = generateVaultKey(testRandom);
    expect(deriveVaultKeys(vaultKey).vaultId).not.toBe(deriveVaultKeys(other).vaultId);
  });

  it('rifiuta una chiave di lunghezza errata', () => {
    expect(() => deriveVaultKeys(new Uint8Array(16))).toThrow(/attesi 32 byte/);
  });
});

describe('authToken', () => {
  it('è esadecimale di 64 caratteri', () => {
    const keys = deriveVaultKeys(generateVaultKey(testRandom));
    expect(authToken(keys)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('non contiene la contentKey', () => {
    // Il token finisce negli header HTTP: il relay lo vede in chiaro.
    const keys = deriveVaultKeys(generateVaultKey(testRandom));
    const token = authToken(keys);
    const contentHex = Buffer.from(keys.contentKey).toString('hex');
    expect(token).not.toContain(contentHex);
  });
});

describe('secretsMatch', () => {
  it('riconosce due sequenze identiche', () => {
    expect(secretsMatch(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it('rifiuta sequenze diverse', () => {
    expect(secretsMatch(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
  });

  it('rifiuta sequenze di lunghezza diversa', () => {
    expect(secretsMatch(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it('rifiuta anche quando differisce solo l ultimo byte', () => {
    // Un confronto con uscita anticipata rivelerebbe via timing quanti byte
    // iniziali sono corretti, permettendo di ricostruire il token un byte alla volta.
    const a = new Uint8Array(32).fill(9);
    const b = new Uint8Array(32).fill(9);
    b[31] = 8;
    expect(secretsMatch(a, b)).toBe(false);
  });
});

describe('assertVaultKey', () => {
  it('accetta una chiave di 32 byte', () => {
    expect(() => assertVaultKey(new Uint8Array(32))).not.toThrow();
  });

  it('rifiuta lunghezze diverse indicando quella ricevuta', () => {
    expect(() => assertVaultKey(new Uint8Array(31))).toThrow(/ricevuti 31/);
  });
});
