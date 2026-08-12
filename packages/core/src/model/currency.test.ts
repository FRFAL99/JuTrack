import { describe, expect, it } from 'vitest';
import { CURRENCIES, currencySymbol, DEFAULT_CURRENCY, isKnownCurrency } from './currency';
import { formatMoney } from './money';

describe('currencySymbol', () => {
  it('dà il simbolo di una valuta nota', () => {
    expect(currencySymbol('EUR')).toBe('€');
    expect(currencySymbol('GBP')).toBe('£');
  });

  it('scrive il codice quando la valuta non è fra quelle note', () => {
    // Non si ripiega sull'euro: una spesa in corone etichettata «€» sarebbe un numero
    // giusto con accanto una parola falsa, che è il modo peggiore di sbagliare.
    expect(currencySymbol('NOK')).toBe('NOK');
  });

  it('non traduce una stringa vuota in qualcosa', () => {
    expect(currencySymbol('')).toBe('');
  });
});

describe('elenco delle valute', () => {
  it('parte da quella di default', () => {
    expect(isKnownCurrency(DEFAULT_CURRENCY)).toBe(true);
    expect(CURRENCIES[0]?.code).toBe(DEFAULT_CURRENCY);
  });

  it('non ha codici né simboli ripetuti', () => {
    // Due voci con lo stesso simbolo sarebbero indistinguibili nel selettore, ed è la
    // ragione per cui le corone stanno fuori: `kr` da solo ne indica tre.
    const codes = CURRENCIES.map((currency) => currency.code);
    const symbols = CURRENCIES.map((currency) => currency.symbol);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('contiene solo codici ISO di tre lettere maiuscole', () => {
    for (const { code } of CURRENCIES) expect(code).toMatch(/^[A-Z]{3}$/);
  });
});

describe('il simbolo arriva davvero al numero', () => {
  it.each(CURRENCIES.map((currency) => [currency.code, currency.symbol]))(
    'formatta 1234 centesimi in %s',
    (code, symbol) => {
      // Due decimali per tutte: è la ragione per cui le valute senza centesimi (JPY)
      // non sono nell'elenco.
      expect(formatMoney(1234, currencySymbol(code!))).toBe(`12,34 ${symbol}`);
    },
  );
});
