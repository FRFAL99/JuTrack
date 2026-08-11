import { describe, expect, it } from 'vitest';
import { AMOUNT_BINS, binsFor } from '@jutrack/core';
import { AMOUNT_CHOICES, amountRange, isAmountChosen } from './amount';

describe('AMOUNT_CHOICES', () => {
  it('sono le stesse sei fasce dell’istogramma, nello stesso ordine', () => {
    // Toccare la barra «20–50» e scegliere «20–50» fra i filtri devono dare lo stesso
    // insieme di spese: due elenchi diversi renderebbero l'istogramma un grafico che
    // indica una cosa e ne seleziona un'altra.
    expect(AMOUNT_CHOICES.map((choice) => choice.label)).toEqual(
      AMOUNT_BINS.map((bin) => bin.label),
    );
  });

  it('il massimo esclusivo dell’istogramma diventa inclusivo per la query', () => {
    // 10,00 € sta in «10–20» e non in «0–10»: con `maxCents: 1000` inclusivo starebbe in
    // entrambe, ed è un centesimo che si perde in silenzio.
    expect(AMOUNT_CHOICES[0]).toEqual({ label: '0–10', minCents: 0, maxCents: 999 });
    expect(AMOUNT_CHOICES[1]).toEqual({ label: '10–20', minCents: 1000, maxCents: 1999 });
  });

  it('l’ultima fascia non ha un massimo', () => {
    expect(AMOUNT_CHOICES[AMOUNT_CHOICES.length - 1]).toEqual({
      label: '200+',
      minCents: 20_000,
      maxCents: null,
    });
  });

  it('il confine cade dalla stessa parte per il filtro e per l’istogramma', () => {
    // La prova vera: una spesa da 10,00 € finisce nella seconda barra, e deve rispettare
    // gli estremi della seconda fascia — non della prima.
    const bins = binsFor([1000]);
    expect(bins[0]?.count).toBe(0);
    expect(bins[1]?.count).toBe(1);

    const first = AMOUNT_CHOICES[0] as (typeof AMOUNT_CHOICES)[number];
    const second = AMOUNT_CHOICES[1] as (typeof AMOUNT_CHOICES)[number];
    expect(1000 > (first.maxCents as number)).toBe(true);
    expect(1000 >= second.minCents && 1000 <= (second.maxCents as number)).toBe(true);
  });
});

describe('amountRange', () => {
  it('porta entrambi gli estremi quando la fascia è chiusa', () => {
    expect(amountRange({ label: '10–20', minCents: 1000, maxCents: 1999 })).toEqual({
      minCents: 1000,
      maxCents: 1999,
    });
  });

  it('omette il massimo invece di scriverlo indefinito', () => {
    // Con `exactOptionalPropertyTypes` una chiave a `undefined` non è una chiave assente, e
    // `ExpenseQuery` rifiuta la prima.
    const range = amountRange({ label: '200+', minCents: 20_000, maxCents: null });
    expect(range).toEqual({ minCents: 20_000 });
    expect('maxCents' in range).toBe(false);
  });
});

describe('isAmountChosen', () => {
  it('riconosce la fascia attiva', () => {
    const choice = { label: '10–20', minCents: 1000, maxCents: 1999 };
    expect(isAmountChosen(choice, { minCents: 1000, maxCents: 1999 })).toBe(true);
    expect(isAmountChosen(choice, { minCents: 1000, maxCents: 5000 })).toBe(false);
  });

  it('la fascia aperta non è scelta se la query ha un massimo', () => {
    const open = { label: '200+', minCents: 20_000, maxCents: null };
    expect(isAmountChosen(open, { minCents: 20_000 })).toBe(true);
    expect(isAmountChosen(open, { minCents: 20_000, maxCents: 50_000 })).toBe(false);
  });

  it('senza fascia attiva non ne risulta scelta nessuna', () => {
    expect(AMOUNT_CHOICES.some((choice) => isAmountChosen(choice, {}))).toBe(false);
  });
});
