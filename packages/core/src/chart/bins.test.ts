import { describe, expect, it } from 'vitest';
import { AMOUNT_BINS, binsFor } from './bins';

describe('binsFor', () => {
  it('mette 10,00 € nella fascia 10–20 e non in 0–10', () => {
    // È il confine che si sbaglia: incluso da entrambe le parti, la stessa spesa finirebbe
    // in due barre a seconda di come è scritto il ciclo.
    const bins = binsFor([1000]);
    expect(bins[0]?.count).toBe(0);
    expect(bins[1]?.count).toBe(1);
  });

  it('tiene i confini di tutte le fasce coerenti fra loro', () => {
    for (const bin of AMOUNT_BINS) {
      const bins = binsFor([bin.minCents]);
      const hit = bins.find((b) => b.count === 1);
      expect(hit?.label).toBe(bin.label);
    }
  });

  it('mette 9,99 € nella prima fascia', () => {
    expect(binsFor([999])[0]?.count).toBe(1);
  });

  it('raccoglie tutto il resto nell ultima fascia, che non ha limite', () => {
    const bins = binsFor([20_000, 1_000_000]);
    expect(bins[bins.length - 1]).toMatchObject({ label: '200+', count: 2 });
  });

  it('conta e somma insieme', () => {
    const bins = binsFor([500, 700]);
    expect(bins[0]).toMatchObject({ count: 2, totalCents: 1200 });
  });

  it('lascia le fasce vuote a zero invece di toglierle', () => {
    // Le fasce fisse sono ciò che rende confrontabili due mesi affiancati: togliere le
    // vuote farebbe scivolare le altre.
    const bins = binsFor([500]);
    expect(bins).toHaveLength(6);
    expect(bins.filter((b) => b.count === 0)).toHaveLength(5);
  });

  it('senza importi restituisce le sei fasce a zero', () => {
    expect(binsFor([]).every((b) => b.count === 0 && b.totalCents === 0)).toBe(true);
  });

  it('non nasconde un importo negativo nella prima fascia', () => {
    // Non esiste fra le spese: se arriva è un difetto a monte, e deve notarsi mancando.
    expect(binsFor([-100]).every((b) => b.count === 0)).toBe(true);
  });

  it('lo zero sta nella prima fascia', () => {
    expect(binsFor([0])[0]?.count).toBe(1);
  });
});
