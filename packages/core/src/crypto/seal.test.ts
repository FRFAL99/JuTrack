import { describe, expect, it } from 'vitest';
import { deriveVaultKeys, generateVaultKey } from './keys';
import { open, seal, SEAL_VERSION } from './seal';
import { fixedRandom, shortRandom, testRandom } from './testing';
import { utf8ToBytes } from './encoding';

const keys = deriveVaultKeys(generateVaultKey(fixedRandom()));
const payload = utf8ToBytes('spesa: 1230 centesimi, categoria spesa alimentare');

const sealIt = (data = payload, vaultId = keys.vaultId) =>
  seal(keys.contentKey, vaultId, data, testRandom);

describe('seal / open', () => {
  it('fa il round-trip del payload', () => {
    const blob = sealIt();
    expect(open(keys.contentKey, keys.vaultId, blob)).toEqual(payload);
  });

  it('scrive la versione dello schema nel primo byte', () => {
    // Permette a un client futuro di riconoscere i blob vecchi invece di
    // decifrare spazzatura.
    expect(sealIt()[0]).toBe(SEAL_VERSION);
  });

  it('produce blob diversi per lo stesso payload', () => {
    // Se due blob identici comparissero sul relay, un osservatore dedurrebbe
    // che sono state registrate due spese uguali.
    expect(sealIt()).not.toEqual(sealIt());
  });

  it('gestisce un payload vuoto', () => {
    const blob = sealIt(new Uint8Array(0));
    expect(open(keys.contentKey, keys.vaultId, blob)).toEqual(new Uint8Array(0));
  });

  it('gestisce un payload grande (100 KB)', () => {
    // Uno snapshot completo del Y.Doc può essere di questo ordine.
    const big = new Uint8Array(100_000).fill(0xab);
    expect(open(keys.contentKey, keys.vaultId, sealIt(big))).toEqual(big);
  });

  it('fallisce se la RandomSource non produce un nonce completo', () => {
    expect(() => seal(keys.contentKey, keys.vaultId, payload, shortRandom)).toThrow(
      /nonce non valido/,
    );
  });
});

describe('open — resistenza alla manomissione', () => {
  it('respinge un ciphertext con un bit alterato', () => {
    // Garanzia 2 del threat model: il relay non può modificare i dati inosservato.
    const blob = sealIt();
    const tampered = Uint8Array.from(blob);
    const last = tampered.length - 1;
    tampered.set([(tampered[last] ?? 0) ^ 0x01], last);
    expect(() => open(keys.contentKey, keys.vaultId, tampered)).toThrow();
  });

  it('respinge un nonce alterato', () => {
    const blob = sealIt();
    const tampered = Uint8Array.from(blob);
    tampered.set([(tampered[5] ?? 0) ^ 0xff], 5);
    expect(() => open(keys.contentKey, keys.vaultId, tampered)).toThrow();
  });

  it('respinge un byte di versione alterato', () => {
    // La versione è dentro la AAD: cambiarla invalida il tag.
    const blob = sealIt();
    const tampered = Uint8Array.from(blob);
    tampered.set([0x02], 0);
    expect(() => open(keys.contentKey, keys.vaultId, tampered)).toThrow(/versione/);
  });

  it('respinge un blob troncato', () => {
    const blob = sealIt();
    expect(() => open(keys.contentKey, keys.vaultId, blob.subarray(0, 20))).toThrow(/troppo corto/);
  });

  it('respinge un blob vuoto', () => {
    expect(() => open(keys.contentKey, keys.vaultId, new Uint8Array(0))).toThrow(/troppo corto/);
  });
});

describe('open — isolamento fra vault', () => {
  it('respinge un blob destinato a un altro vaultId', () => {
    // Il vaultId è nella AAD: impedisce a un relay ostile di travasare blob
    // da un vault all'altro.
    const blob = sealIt();
    const otherVaultId = deriveVaultKeys(generateVaultKey(testRandom)).vaultId;
    expect(() => open(keys.contentKey, otherVaultId, blob)).toThrow();
  });

  it('respinge la decifratura con la chiave di un altro vault', () => {
    const blob = sealIt();
    const otherKeys = deriveVaultKeys(generateVaultKey(testRandom));
    expect(() => open(otherKeys.contentKey, keys.vaultId, blob)).toThrow();
  });

  it('respinge la decifratura con authKey al posto di contentKey', () => {
    // Verifica concreta della separazione di dominio: il relay conosce authKey
    // e non deve poterci fare nulla.
    const blob = sealIt();
    expect(() => open(keys.authKey, keys.vaultId, blob)).toThrow();
  });
});
