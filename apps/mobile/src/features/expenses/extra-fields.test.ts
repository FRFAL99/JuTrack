import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { extraSummary, tagChoices } from './extra-fields';

describe('extraSummary', () => {
  it('senza niente dice Facoltativi', () => {
    expect(extraSummary('', [])).toBe('Facoltativi');
  });

  it('col solo negozio dice il negozio', () => {
    expect(extraSummary('Esselunga', [])).toBe('Esselunga');
  });

  it('coi soli tag ne dice il numero', () => {
    expect(extraSummary('', ['casa'])).toBe('1 tag');
    expect(extraSummary('', ['casa', 'regalo', 'viaggio'])).toBe('3 tag');
  });

  it('con entrambi li unisce con il punto mediano', () => {
    expect(extraSummary('Esselunga', ['casa', 'regalo'])).toBe('Esselunga · 2 tag');
  });

  it('un negozio lungo viene troncato invece di mandare la riga a capo', () => {
    // Il taglio del `numberOfLines` mangerebbe la coda, cioè proprio il «· 2 tag» che dice
    // che sotto la tendina c'è dell'altro.
    const summary = extraSummary('Supermercato di via Giuseppe Garibaldi', ['casa', 'regalo']);
    expect(summary).toBe('Supermercato di via… · 2 tag');
  });

  it('non tronca un negozio che ci sta', () => {
    expect(extraSummary('Bar dello Sport', [])).toBe('Bar dello Sport');
  });

  it('non conta i tag vuoti', () => {
    expect(extraSummary('', ['', '   '])).toBe('Facoltativi');
  });

  it('ignora gli spazi attorno al negozio', () => {
    expect(extraSummary('  Coop  ', [])).toBe('Coop');
  });
});

describe('tagChoices', () => {
  it('mette in cima i tag scelti, poi gli altri già usati', () => {
    expect(tagChoices(['regalo'], ['casa', 'viaggio'])).toEqual(['regalo', 'casa', 'viaggio']);
  });

  it('non ripete un tag scelto che esiste già nel gruppo con un altra grafia', () => {
    // Scritto `Regalo` qui e `regalo` altrove è lo stesso tag: due pillole sarebbero due
    // modi di scegliere la stessa cosa.
    expect(tagChoices(['Regalo'], ['regalo', 'casa'])).toEqual(['Regalo', 'casa']);
  });

  it('non duplica i suggerimenti che differiscono solo per maiuscole', () => {
    expect(tagChoices([], ['casa', 'Casa'])).toEqual(['casa']);
  });

  it('regge le due liste vuote', () => {
    expect(tagChoices([], [])).toEqual([]);
  });
});

describe('in inglese', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('mette la s ai tag dal secondo in poi', () => {
    // In italiano «tag» è invariabile e le due forme del dizionario sono identiche; in
    // inglese no. È il caso che giustifica la chiamata a `plural` anche dove sembrava
    // inutile.
    expect(extraSummary('', ['a'])).toBe('1 tag');
    expect(extraSummary('', ['a', 'b'])).toBe('2 tags');
  });

  it('traduce il posto vuoto', () => {
    expect(extraSummary('', [])).toBe('Optional');
  });

  it('non tocca il nome del negozio, che l ha scritto qualcuno', () => {
    expect(extraSummary('Esselunga', ['a'])).toBe('Esselunga · 1 tag');
  });
});
