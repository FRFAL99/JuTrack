/**
 * Il QR è l'unico punto dell'app in cui una libreria di terze parti elabora la chiave
 * del vault. Questi test verificano che produca un simbolo plausibile e che regga
 * l'ambiente ristretto di Hermes, dove `TextEncoder` e `Buffer` non esistono — la stessa
 * assenza che ha già fatto crashare l'app all'avvio una volta.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPairingInvite, generateVaultKey } from '@jutrack/core';
import { buildQrPath, QUIET_ZONE } from './qr-path';

const key = generateVaultKey({
  getRandomBytes: (length) => Uint8Array.from({ length }, (_, i) => (i * 7 + 3) & 0xff),
});
const { uri } = createPairingInvite(key, { now: 1_800_000_000_000 });

describe('buildQrPath', () => {
  it('produce una griglia quadrata con la zona di quiete su entrambi i lati', () => {
    const { extent } = buildQrPath(uri);
    // Le versioni QR vanno da 21 moduli (v1) in su, a passi di 4.
    const modules = extent - QUIET_ZONE * 2;
    expect(modules).toBeGreaterThanOrEqual(21);
    expect((modules - 21) % 4).toBe(0);
  });

  it('tiene un invito di pairing in una griglia ancora inquadrabile da lontano', () => {
    // Oltre la versione 6 (41 moduli) i quadratini diventano minuti sullo schermo di un
    // telefono e la scansione dall'altro dispositivo diventa faticosa.
    expect(buildQrPath(uri).extent - QUIET_ZONE * 2).toBeLessThanOrEqual(41);
  });

  it('disegna i moduli scuri come quadrati unitari', () => {
    const { path } = buildQrPath(uri);
    expect(path).not.toBe('');
    expect(path.startsWith('M')).toBe(true);
    // Ogni segmento è un quadrato chiuso: nessun tracciato aperto che l'SVG riempirebbe
    // in modo imprevedibile.
    expect(path.split('z').length - 1).toBe(path.split('M').length - 1);
  });

  it('è deterministica: lo stesso invito dà lo stesso disegno', () => {
    expect(buildQrPath(uri)).toEqual(buildQrPath(uri));
  });

  it('cambia disegno al cambiare del contenuto', () => {
    expect(buildQrPath(uri).path).not.toBe(buildQrPath(`${uri}0`).path);
  });
});

describe('su Hermes', () => {
  /** Global presenti in Node ma assenti nel motore di React Native. */
  const ABSENT_ON_HERMES = ['TextEncoder', 'Buffer'] as const;
  const saved = new Map<string, unknown>();

  beforeEach(() => {
    for (const name of ABSENT_ON_HERMES) {
      if (name in globalThis) {
        saved.set(name, (globalThis as Record<string, unknown>)[name]);
        delete (globalThis as Record<string, unknown>)[name];
      }
    }
  });

  afterEach(() => {
    for (const [name, value] of saved) {
      (globalThis as Record<string, unknown>)[name] = value;
    }
    saved.clear();
  });

  it('genera il QR senza TextEncoder né Buffer', () => {
    expect(() => buildQrPath(uri)).not.toThrow();
  });
});
