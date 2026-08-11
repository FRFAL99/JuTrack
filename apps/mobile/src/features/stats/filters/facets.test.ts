import { describe, expect, it } from 'vitest';
import { isEmptyQuery } from '@jutrack/core';
import { hasValue, KEY_OF, toggleValue } from './facets';

describe('toggleValue', () => {
  it('accende una voce che non c’è', () => {
    expect(toggleValue(undefined, 'cibo')).toEqual(['cibo']);
    expect(toggleValue(['casa'], 'cibo')).toEqual(['casa', 'cibo']);
  });

  it('spegne una voce già accesa', () => {
    expect(toggleValue(['casa', 'cibo'], 'casa')).toEqual(['cibo']);
  });

  it('l’ultima voce spenta lascia il filtro assente, non un elenco vuoto', () => {
    // Una chiave assente e una chiave con l'elenco vuoto vogliono dire la stessa cosa —
    // «tutte» — ma `isEmptyQuery` conta le chiavi: con l'elenco vuoto la barra
    // continuerebbe a mostrare «azzera i filtri» per un filtro che non c'è più.
    const off = toggleValue(['casa'], 'casa');
    expect(off).toBeUndefined();
    expect(isEmptyQuery({ tags: off ?? [] })).toBe(true);
  });

  it('non tocca l’elenco ricevuto', () => {
    const before = ['casa'];
    toggleValue(before, 'cibo');
    expect(before).toEqual(['casa']);
  });

  it('un negozio si spegne anche scritto con un’altra grafia', () => {
    // Il filtro salva la grafia scritta, i suggerimenti mostrano la più usata: senza il
    // confronto sulla chiave la pillola resterebbe accesa e non si riuscirebbe a togliere.
    expect(toggleValue(['Esselunga'], 'esselunga', KEY_OF.store)).toBeUndefined();
  });

  it('un tag scritto con la maiuscola non si aggiunge due volte', () => {
    expect(toggleValue(['regalo'], 'Regalo', KEY_OF.tag)).toBeUndefined();
  });

  it('le categorie si confrontano sull’id, senza normalizzazioni', () => {
    expect(toggleValue(['cat-1'], 'cat-2', KEY_OF.category)).toEqual(['cat-1', 'cat-2']);
  });
});

describe('hasValue', () => {
  it('risponde con lo stesso confronto di toggleValue', () => {
    expect(hasValue(['Esselunga'], 'esselunga', KEY_OF.store)).toBe(true);
    expect(hasValue(['Esselunga'], 'coop', KEY_OF.store)).toBe(false);
    expect(hasValue(undefined, 'coop', KEY_OF.store)).toBe(false);
  });
});
