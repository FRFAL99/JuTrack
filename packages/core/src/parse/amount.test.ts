import { describe, expect, it } from 'vitest';
import { findAmount } from './amount';
import { ITALIAN_LEXICON } from './lexicon';
import { newTaken, take, tokenize } from './tokens';

/** L'importo letto da una frase, in centesimi, o `null`. */
function cents(text: string): number | null {
  const tokens = tokenize(text);
  return findAmount(tokens, newTaken(tokens.length), ITALIAN_LEXICON).match?.cents ?? null;
}

function ambiguous(text: string): boolean {
  const tokens = tokenize(text);
  return findAmount(tokens, newTaken(tokens.length), ITALIAN_LEXICON).ambiguous;
}

describe('findAmount', () => {
  it('prende il numero nudo', () => {
    expect(cents('25 spesa')).toBe(2500);
    expect(cents('cena con i suoi 40')).toBe(4000);
  });

  it('legge la virgola e il punto come separatore dei centesimi', () => {
    expect(cents('12,50 conad')).toBe(1250);
    expect(cents('12.50 conad')).toBe(1250);
  });

  it('legge il punto delle migliaia senza moltiplicare per cento', () => {
    // La trappola: togliere sempre il punto farebbe di «25.50» duemilacinquecentocinquanta.
    expect(cents('1.234,56 affitto')).toBe(123456);
    expect(cents('25.50 affitto')).toBe(2550);
  });

  it('non compila con due numeri nudi, e lo dichiara', () => {
    expect(cents('birra 5 10')).toBeNull();
    expect(ambiguous('birra 5 10')).toBe(true);
  });

  it('un segno di valuta decide fra due numeri', () => {
    expect(cents('birra 5 10€')).toBe(1000);
    expect(cents('birra 5 €10')).toBe(1000);
    expect(cents('birra 5 10 euro')).toBe(1000);
    expect(ambiguous('birra 5 10 euro')).toBe(false);
  });

  it('consuma anche il marcatore di valuta staccato', () => {
    const tokens = tokenize('10 euro di pane');
    const result = findAmount(tokens, newTaken(tokens.length), ITALIAN_LEXICON);
    expect(result.match).toEqual({ cents: 1000, from: 0, to: 1 });
  });

  it('non tocca un numero che una data si è già presa', () => {
    // «il 3» è una data, quindi resta un numero solo: niente ambiguità.
    expect(cents('25 spesa il 3')).toBe(2500);
    expect(cents('spesa il 3 agosto')).toBeNull();
    expect(ambiguous('spesa il 3 agosto')).toBe(false);
  });

  it('non tocca un numero già consumato da qualcun altro', () => {
    const tokens = tokenize('5 10');
    const taken = newTaken(tokens.length);
    take(taken, 0, 0);
    expect(findAmount(tokens, taken, ITALIAN_LEXICON).match?.cents).toBe(1000);
  });

  it('rifiuta zero, i negativi e i tre decimali', () => {
    expect(cents('pane 0')).toBeNull();
    expect(cents('pane -5')).toBeNull();
    expect(cents('pane 12,505')).toBeNull();
  });

  it('non trova niente in una frase senza numeri', () => {
    expect(cents('spesa esselunga')).toBeNull();
    expect(ambiguous('spesa esselunga')).toBe(false);
  });
});
