import { describe, expect, it } from 'vitest';
import {
  areFree,
  fold,
  isFree,
  keyOf,
  leftover,
  newTaken,
  plainOf,
  spanOf,
  take,
  tokenize,
} from './tokens';

describe('tokenize', () => {
  it('conserva gli estremi sul testo originale, non su uno ripulito', () => {
    // Due spazi fra le parole: è il caso in cui normalizzare prima di tokenizzare
    // sposterebbe l'evidenziazione, e lo farebbe solo qui.
    const text = '25  spesa';
    const tokens = tokenize(text);
    expect(tokens.map((t) => t.raw)).toEqual(['25', 'spesa']);
    expect(text.slice(tokens[1]!.start, tokens[1]!.end)).toBe('spesa');
  });

  it('non spezza una coppia surrogata', () => {
    const text = '🍝 cena';
    const tokens = tokenize(text);
    expect(tokens[0]!.raw).toBe('🍝');
    expect(text.slice(tokens[1]!.start, tokens[1]!.end)).toBe('cena');
  });

  it('toglie la punteggiatura ai margini e la lascia dentro', () => {
    const tokens = tokenize('25, «esselunga» 12,50 #casa');
    expect(tokens.map((t) => t.core)).toEqual(['25', 'esselunga', '12,50', 'casa']);
  });

  it('non tocca il € , che è un marcatore di valuta e non punteggiatura', () => {
    expect(tokenize('25€')[0]!.core).toBe('25€');
  });

  it('tiene separate la chiave del vocabolario e quella del lessico', () => {
    const [token] = tokenize('Metà');
    // `key` conserva l'accento perché lo conserva `storeKey`: «città» e «citta» sono due
    // negozi diversi finché naming.ts la pensa così.
    expect(token!.key).toBe('metà');
    expect(token!.plain).toBe('meta');
  });

  it('riporta l apostrofo tipografico a quello dritto', () => {
    expect(tokenize('l’altro')[0]!.plain).toBe("l'altro");
  });
});

describe('fold', () => {
  it('toglie tutti gli accenti italiani', () => {
    expect(fold('Perché Lunedì Però Più')).toBe('perche lunedi pero piu');
  });
});

describe('il registro dei consumi', () => {
  it('parte tutto libero e si chiude a intervalli', () => {
    const taken = newTaken(4);
    expect(areFree(taken, 0, 3)).toBe(true);
    take(taken, 1, 2);
    expect(isFree(taken, 0)).toBe(true);
    expect(isFree(taken, 1)).toBe(false);
    expect(areFree(taken, 0, 3)).toBe(false);
  });

  it('considera occupato ciò che non esiste', () => {
    expect(isFree(newTaken(2), 5)).toBe(false);
    expect(isFree(newTaken(2), -1)).toBe(false);
  });
});

describe('le forme unite di più token', () => {
  const tokens = tokenize('Mercato  Centrale');

  it('uniscono con un solo spazio, comunque fossero scritte', () => {
    expect(keyOf(tokens, 0, 1)).toBe('mercato centrale');
    expect(plainOf(tokens, 0, 1)).toBe('mercato centrale');
  });

  it('danno un intervallo che copre tutto, spazi interni compresi', () => {
    expect(spanOf(tokens, 0, 1)).toEqual({ start: 0, end: 17 });
  });
});

describe('leftover', () => {
  it('restituisce ciò che nessuno ha preso, nell ordine scritto', () => {
    const tokens = tokenize('cena con i suoi 40');
    const taken = newTaken(tokens.length);
    take(taken, 4, 4);
    expect(leftover(tokens, taken)).toBe('cena con i suoi');
  });

  it('è vuoto quando tutto è stato capito', () => {
    const tokens = tokenize('25 ieri');
    const taken = newTaken(tokens.length);
    take(taken, 0, 1);
    expect(leftover(tokens, taken)).toBe('');
  });
});
