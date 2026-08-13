import { beforeEach, describe, expect, it } from 'vitest';
import { ENGLISH_NUMBERS, ITALIAN_NUMBERS } from '@jutrack/core';
import i18n from './index';
import { formatCents, formatMoney, numberFormat } from './money';

/**
 * Il legame fra lingua e formato dei numeri.
 *
 * Il core ha già i suoi test sui due formati; qui si verifica la sola cosa che il core non
 * può sapere, cioè **quale dei due si applica**. Sono tre righe di codice, ma sono le tre
 * righe da cui dipende ogni importo dell'app.
 */

describe('formato dei numeri e lingua', () => {
  it('in italiano scrive punto per le migliaia e virgola per i decimali', () => {
    expect(numberFormat()).toBe(ITALIAN_NUMBERS);
    expect(formatCents(123_456)).toBe('1.234,56');
    expect(formatMoney(123_456)).toBe('1.234,56 €');
  });

  describe('in inglese', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('scambia i separatori e porta il simbolo davanti', () => {
      expect(numberFormat()).toBe(ENGLISH_NUMBERS);
      expect(formatCents(123_456)).toBe('1,234.56');
      expect(formatMoney(123_456)).toBe('€1,234.56');
    });

    it('tiene distinti simbolo e formato', () => {
      // Sono due scelte separate del profilo: la valuta (Step 29) e la lingua (Step 37). Chi
      // vive qui e non parla italiano legge in inglese importi in euro, ed è il caso normale
      // — non un caso limite.
      expect(formatMoney(500, '€')).toBe('€5.00');
      // Lo spazio in mezzo lo mette il core: «CHF5.00» si leggerebbe come una sigla sola.
      expect(formatMoney(500, 'CHF')).toBe('CHF 5.00');
    });
  });

  it('torna all italiano appena la lingua torna indietro', () => {
    // Il formato si legge a ogni chiamata, non si memorizza: è la stessa proprietà che
    // permette a `LanguageSync` di far cambiare tutta l'app senza riavviarla.
    expect(formatMoney(500)).toBe('5,00 €');
  });

  it('ripiega sull italiano per una lingua senza formato proprio', async () => {
    // Non capita dal selettore — offre due lingue — ma può capitare da un profilo scritto da
    // una versione futura. Meglio i numeri di una lingua vicina che una funzione che solleva.
    await i18n.changeLanguage('de');
    expect(numberFormat()).toBe(ITALIAN_NUMBERS);
    await i18n.changeLanguage('it');
  });
});
