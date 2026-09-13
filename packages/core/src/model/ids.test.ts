import { describe, expect, it } from 'vitest';
import { budgetKey, parseBudgetKey, parseVocabularyKey, vocabularyKey } from './ids';

describe('vocabularyKey', () => {
  it('va e torna', () => {
    expect(parseVocabularyKey(vocabularyKey('tag', 'vacanza'))).toEqual({
      kind: 'tag',
      key: 'vacanza',
    });
    expect(parseVocabularyKey(vocabularyKey('store', 'esselunga'))).toEqual({
      kind: 'store',
      key: 'esselunga',
    });
  });

  /**
   * Il motivo per cui `parseVocabularyKey` non è una copia di `parseBudgetKey`.
   *
   * Con `lastIndexOf` questa chiave darebbe famiglia `store:coop` — che non è una famiglia —
   * e la voce sparirebbe dall'elenco senza che nulla lo dica.
   */
  it('regge un nome che contiene due punti, tagliando al primo', () => {
    const composite = vocabularyKey('store', 'coop: centro');
    expect(parseVocabularyKey(composite)).toEqual({ kind: 'store', key: 'coop: centro' });
    // La prova che le due regole sono davvero diverse, e non una svista che si somigliano.
    expect(parseBudgetKey(composite)).not.toEqual(parseVocabularyKey(composite));
  });

  it('rifiuta una famiglia che non esiste', () => {
    expect(parseVocabularyKey('colore:rosso')).toBeNull();
    expect(parseVocabularyKey('TAG:vacanza')).toBeNull();
  });

  it('rifiuta una chiave malformata', () => {
    expect(parseVocabularyKey('')).toBeNull();
    expect(parseVocabularyKey('vacanza')).toBeNull();
    expect(parseVocabularyKey(':vacanza')).toBeNull();
    expect(parseVocabularyKey('tag:')).toBeNull();
  });
});

describe('budgetKey', () => {
  // Sta qui accanto di proposito: le due chiavi composite si somigliano e tagliano al
  // contrario, ed è utile vederlo in un file solo.
  it('taglia all ultimo due punti, perché il mese sta in fondo', () => {
    expect(parseBudgetKey(budgetKey('categoria-1', '2026-09'))).toEqual({
      categoryId: 'categoria-1',
      month: '2026-09',
    });
  });

  it('rifiuta una chiave malformata', () => {
    expect(parseBudgetKey('senza-mese')).toBeNull();
    expect(parseBudgetKey(':2026-09')).toBeNull();
    expect(parseBudgetKey('categoria-1:')).toBeNull();
  });
});
