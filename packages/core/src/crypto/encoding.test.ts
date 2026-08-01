import { describe, expect, it } from 'vitest';
import { base64urlToBytes, bytesToBase64url, utf8ToBytes } from './encoding';
import { testRandom } from './testing';

describe('utf8ToBytes', () => {
  // TextEncoder di Node come riferimento indipendente. Nel *codice* non si può usare
  // (su Hermes non esiste), ma nei test è esattamente ciò che serve per confrontare.
  const reference = (s: string) => new TextEncoder().encode(s);

  it.each([
    ['stringa vuota', ''],
    ['ASCII', 'spesa alimentare'],
    ['accenti italiani', 'caffè perché città però'],
    ['due byte', 'ñÿ¡¿'],
    ['tre byte', '€ ₹ ☕ ✈'],
    ['emoji (coppie surrogate)', '🛒 🏠 🍕 🚗 💊'],
    ['emoji composta', '👨‍👩‍👧‍👦'],
    ['emoji con modificatore', '👍🏽'],
    ['cirillico', 'Привет'],
    ['CJK', '日本語のテキスト'],
    ['misto', 'Spesa 🛒 al mercato — 12,30 €'],
    ['NFD (accento combinante)', 'café'],
  ])('coincide con TextEncoder su %s', (_label, input) => {
    expect(utf8ToBytes(input)).toEqual(reference(input));
  });

  it('coincide con TextEncoder su tutto il Basic Multilingual Plane', () => {
    // Scorre tutti i codepoint validi sotto 0x10000, saltando i surrogati che
    // da soli non sono caratteri.
    for (let cp = 0; cp < 0x10000; cp++) {
      if (cp >= 0xd800 && cp <= 0xdfff) continue;
      const s = String.fromCharCode(cp);
      expect(utf8ToBytes(s), `codepoint U+${cp.toString(16)}`).toEqual(reference(s));
    }
  });

  it('coincide con TextEncoder su codepoint oltre il BMP', () => {
    for (let cp = 0x10000; cp < 0x110000; cp += 997) {
      const s = String.fromCodePoint(cp);
      expect(utf8ToBytes(s), `codepoint U+${cp.toString(16)}`).toEqual(reference(s));
    }
  });

  it('sostituisce un surrogato spaiato come fa TextEncoder', () => {
    // Un surrogato alto senza il basso non è un carattere valido: entrambe le
    // implementazioni devono emettere U+FFFD, non byte arbitrari.
    const lone = '\ud83d';
    expect(utf8ToBytes(lone)).toEqual(reference(lone));
    expect(utf8ToBytes(`a${lone}b`)).toEqual(reference(`a${lone}b`));
  });

  it('non usa TextEncoder', async () => {
    // Il motivo per cui questa funzione esiste: su Hermes `TextEncoder` non è
    // definito. Se qualcuno la riscrivesse usandolo, qui si accorgerebbe subito.
    const original = globalThis.TextEncoder;
    // @ts-expect-error rimozione deliberata per simulare Hermes
    delete globalThis.TextEncoder;
    try {
      expect(utf8ToBytes('caffè 🛒')).toEqual(
        Uint8Array.from([99, 97, 102, 102, 195, 168, 32, 240, 159, 155, 146]),
      );
    } finally {
      globalThis.TextEncoder = original;
    }
  });
});

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
