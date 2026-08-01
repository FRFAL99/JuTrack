import { describe, expect, it } from 'vitest';
import { daysInMonth, monthBounds, monthOf, monthsBetween, shiftMonth } from './period';

describe('monthOf', () => {
  it('estrae il mese da una data', () => {
    expect(monthOf('2026-08-15')).toBe('2026-08');
  });
});

describe('shiftMonth', () => {
  it('avanza e arretra dentro lo stesso anno', () => {
    expect(shiftMonth('2026-08', 1)).toBe('2026-09');
    expect(shiftMonth('2026-08', -1)).toBe('2026-07');
  });

  it('scavalca il capodanno in entrambe le direzioni', () => {
    // Il resto negativo di JavaScript (`-1 % 12 === -1`) darebbe il mese 0 senza
    // normalizzazione.
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('gestisce salti di più anni', () => {
    expect(shiftMonth('2026-03', -26)).toBe('2024-01');
    expect(shiftMonth('2026-03', 25)).toBe('2028-04');
  });

  it('è reversibile', () => {
    expect(shiftMonth(shiftMonth('2026-08', -7), 7)).toBe('2026-08');
  });
});

describe('monthBounds', () => {
  it('copre il mese intero', () => {
    expect(monthBounds('2026-08')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });

  it('conosce i mesi da 30 giorni', () => {
    expect(monthBounds('2026-04').to).toBe('2026-04-30');
  });

  it('conosce febbraio, anche bisestile', () => {
    // Un 28 fisso perderebbe le spese del 29 in un anno su quattro.
    expect(monthBounds('2026-02').to).toBe('2026-02-28');
    expect(monthBounds('2028-02').to).toBe('2028-02-29');
    expect(daysInMonth('2100-02')).toBe(28);
    expect(daysInMonth('2000-02')).toBe(29);
  });
});

describe('monthsBetween', () => {
  it('produce una sequenza continua, estremi inclusi', () => {
    expect(monthsBetween('2026-11', '2027-02')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('un mese solo se gli estremi coincidono', () => {
    expect(monthsBetween('2026-08', '2026-08')).toEqual(['2026-08']);
  });

  it('restituisce vuoto se gli estremi sono invertiti, senza bloccarsi', () => {
    expect(monthsBetween('2026-08', '2026-01')).toEqual([]);
  });
});
