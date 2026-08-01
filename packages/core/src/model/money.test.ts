import { describe, expect, it } from 'vitest';
import {
  assertCents,
  formatCents,
  formatMoney,
  isValidCents,
  parseAmount,
  splitByWeights,
  splitEvenly,
} from './money';

describe('parseAmount', () => {
  it.each([
    ['12,30', 1230],
    ['12.30', 1230],
    ['0,05', 5],
    ['5', 500],
    ['5,', 500],
    [',5', 50],
    ['0,5', 50],
    ['1000', 100_000],
    ['1234,56', 123_456],
    ['-12,30', -1230],
    ['  12,30  ', 1230],
    ['1 2,30', 1230],
  ])('interpreta %j come %i centesimi', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '12,345', '1,2,3', '.', '-', '12a', '--5'])(
    'rifiuta %j restituendo null',
    (input) => {
      // null e non NaN: un NaN si propagherebbe silenziosamente nei totali.
      expect(parseAmount(input)).toBeNull();
    },
  );

  it('non introduce errori di virgola mobile', () => {
    // È la ragione per cui esiste questa funzione: `0.1 * 100` in float dà 10.000000000000002.
    expect(parseAmount('0,10')).toBe(10);
    expect(parseAmount('0,29')).toBe(29);
    expect(parseAmount('1,15')).toBe(115);
    expect(parseAmount('8,20')).toBe(820);
  });

  it('somma di importi digitati resta esatta', () => {
    const a = parseAmount('0,10');
    const b = parseAmount('0,20');
    expect((a ?? 0) + (b ?? 0)).toBe(30); // in float sarebbe 0.30000000000000004
  });
});

describe('formatCents', () => {
  it.each([
    [0, '0,00'],
    [5, '0,05'],
    [50, '0,50'],
    [1230, '12,30'],
    [100_000, '1.000,00'],
    [123_456_789, '1.234.567,89'],
    [-1230, '-12,30'],
    [-5, '-0,05'],
  ])('formatta %i come %j', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });

  it('aggiunge il simbolo di valuta', () => {
    expect(formatMoney(1230)).toBe('12,30 €');
  });

  it('fa il round-trip con parseAmount', () => {
    for (const cents of [0, 1, 99, 100, 1230, 999_999]) {
      expect(parseAmount(formatCents(cents).replace(/\./g, ''))).toBe(cents);
    }
  });

  it('rifiuta un float', () => {
    expect(() => formatCents(12.5)).toThrow(/non possono essere float/);
  });
});

describe('isValidCents / assertCents', () => {
  it.each([0, 1, -1, 1230, Number.MAX_SAFE_INTEGER])('accetta %i', (v) => {
    expect(isValidCents(v)).toBe(true);
  });

  it.each([1.5, NaN, Infinity, -Infinity, 0.1])('rifiuta %j', (v) => {
    expect(isValidCents(v)).toBe(false);
    expect(() => assertCents(v)).toThrow();
  });

  it('include l etichetta nel messaggio di errore', () => {
    expect(() => assertCents(1.5, 'quota')).toThrow(/quota non valido/);
  });
});

describe('splitEvenly', () => {
  it('divide un importo divisibile esattamente', () => {
    expect(splitEvenly(1000, 2)).toEqual([500, 500]);
  });

  it('non perde centesimi su una divisione inesatta', () => {
    // 10,00 € fra 3: la trappola classica. 3,33 × 3 = 9,99 e un centesimo sparisce.
    const parts = splitEvenly(1000, 3);
    expect(parts).toEqual([334, 333, 333]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('conserva il totale per ogni combinazione fino a 12 quote', () => {
    // Proprietà invariante: qualunque sia l'importo, la somma delle quote è il totale.
    for (let total = 0; total <= 200; total++) {
      for (let parts = 1; parts <= 12; parts++) {
        const split = splitEvenly(total, parts);
        expect(
          split.reduce((a, b) => a + b, 0),
          `${total} in ${parts}`,
        ).toBe(total);
      }
    }
  });

  it('distribuisce il resto ai primi, in modo deterministico', () => {
    // Deterministico e non casuale: i due telefoni devono calcolare la stessa
    // suddivisione senza consultarsi.
    expect(splitEvenly(100, 3)).toEqual([34, 33, 33]);
    expect(splitEvenly(100, 3)).toEqual(splitEvenly(100, 3));
  });

  it('gestisce gli importi negativi conservando il totale', () => {
    const parts = splitEvenly(-1000, 3);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(-1000);
  });

  it('gestisce una quota sola', () => {
    expect(splitEvenly(1234, 1)).toEqual([1234]);
  });

  it('rifiuta un numero di quote non valido', () => {
    expect(() => splitEvenly(100, 0)).toThrow(/non valido/);
    expect(() => splitEvenly(100, -1)).toThrow(/non valido/);
    expect(() => splitEvenly(100, 1.5)).toThrow(/non valido/);
  });
});

describe('splitByWeights', () => {
  it('divide in parti uguali con pesi uguali', () => {
    expect(splitByWeights(1000, [1, 1])).toEqual([500, 500]);
  });

  it('rispetta pesi diversi', () => {
    expect(splitByWeights(1000, [3, 1])).toEqual([750, 250]);
  });

  it('assegna il resto a chi ha il resto frazionario maggiore', () => {
    // 100 con pesi [1,1,1] → 33,33 ciascuno; il centesimo avanzato va al primo.
    const parts = splitByWeights(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });

  it('conserva il totale su molti casi', () => {
    const weightSets = [
      [1, 1],
      [1, 2],
      [1, 1, 1],
      [2, 3, 5],
      [1, 0],
      [7, 11, 13],
    ];
    for (let total = 0; total <= 300; total++) {
      for (const weights of weightSets) {
        const split = splitByWeights(total, weights);
        expect(
          split.reduce((a, b) => a + b, 0),
          `${total} pesi ${weights}`,
        ).toBe(total);
      }
    }
  });

  it('assegna zero a chi ha peso zero', () => {
    expect(splitByWeights(1000, [1, 0])).toEqual([1000, 0]);
  });

  it('è deterministica a parità di resto', () => {
    // A parità di resto frazionario vince l'indice più basso: senza questa regola
    // i due dispositivi potrebbero produrre suddivisioni diverse.
    expect(splitByWeights(100, [1, 1, 1])).toEqual(splitByWeights(100, [1, 1, 1]));
  });

  it('gestisce importi negativi', () => {
    expect(splitByWeights(-1000, [1, 1]).reduce((a, b) => a + b, 0)).toBe(-1000);
  });

  it('rifiuta pesi non validi', () => {
    expect(() => splitByWeights(100, [])).toThrow(/almeno due quote/);
    expect(() => splitByWeights(100, [0, 0])).toThrow(/maggiore di zero/);
    expect(() => splitByWeights(100, [-1, 2])).toThrow(/non negativi/);
    expect(() => splitByWeights(100, [NaN, 1])).toThrow(/non negativi/);
  });
});
