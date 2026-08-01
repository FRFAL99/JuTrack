import { describe, expect, it } from 'vitest';
import { base64urlToBytes, bytesToBase64url } from './encoding';
import { testRandom } from './testing';

describe('base64url', () => {
  it('fa il round-trip su tutte le lunghezze da 0 a 64 byte', () => {
    // Le lunghezze non multiple di 3 sono il punto in cui si sbagliano le
    // implementazioni base64: qui si coprono tutti e tre i resti.
    for (let n = 0; n <= 64; n++) {
      const bytes = testRandom.getRandomBytes(n);
      expect(base64urlToBytes(bytesToBase64url(bytes)), `lunghezza ${n}`).toEqual(bytes);
    }
  });

  it('fa il round-trip su tutti i 256 valori di byte', () => {
    const all = new Uint8Array(256);
    for (let i = 0; i < 256; i++) all[i] = i;
    expect(base64urlToBytes(bytesToBase64url(all))).toEqual(all);
  });

  it('non emette caratteri che richiedono escaping in URL', () => {
    // È la ragione per cui si usa base64url e non base64 standard: questi valori
    // finiscono nei link di pairing.
    const bytes = testRandom.getRandomBytes(512);
    expect(bytesToBase64url(bytes)).toMatch(/^[A-Za-z0-9_-]*$/);
  });

  it('produce lo stesso risultato di Node per base64url', () => {
    // Confronto con un'implementazione indipendente, così un errore nella nostra
    // non passa inosservato solo perché il round-trip è coerente con se stesso.
    for (let n = 0; n <= 32; n++) {
      const bytes = testRandom.getRandomBytes(n);
      const expected = Buffer.from(bytes).toString('base64url');
      expect(bytesToBase64url(bytes), `lunghezza ${n}`).toBe(expected);
    }
  });

  it('decodifica input prodotti da Node', () => {
    const bytes = testRandom.getRandomBytes(48);
    expect(base64urlToBytes(Buffer.from(bytes).toString('base64url'))).toEqual(bytes);
  });

  it('accetta padding e alfabeto base64 standard', () => {
    // Tolleranza sull'input: un backup incollato da una fonte che usa base64
    // classico deve comunque funzionare.
    const bytes = testRandom.getRandomBytes(16);
    expect(base64urlToBytes(Buffer.from(bytes).toString('base64'))).toEqual(bytes);
  });

  it('rifiuta caratteri non validi', () => {
    expect(() => base64urlToBytes('abc!def')).toThrow(/carattere/);
  });

  it('rifiuta una lunghezza incoerente', () => {
    // 5 sextetti = 4 + 1: quel sextetto orfano non può derivare da alcun byte.
    expect(() => base64urlToBytes('AAAAA')).toThrow(/lunghezza incoerente/);
  });
});
