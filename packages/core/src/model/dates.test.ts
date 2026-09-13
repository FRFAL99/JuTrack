import { describe, expect, it } from 'vitest';
import { assertIsoDate, isIsoDate } from './dates';

describe('isIsoDate', () => {
  it('accetta un giorno scritto per esteso', () => {
    expect(isIsoDate('2026-09-13')).toBe(true);
    expect(isIsoDate('2026-01-01')).toBe(true);
    expect(isIsoDate('2026-12-31')).toBe(true);
  });

  it('accetta il 29 febbraio di un anno bisestile e rifiuta quello di un anno normale', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
  });

  // La regex da sola li accetterebbe tutti e tre: è il giro attraverso `Date.UTC` a
  // scartarli, e senza quello `2026-02-30` entrerebbe nel documento.
  it('rifiuta un giorno che non esiste pur avendo la forma giusta', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-04-31')).toBe(false);
    expect(isIsoDate('2026-00-10')).toBe(false);
    expect(isIsoDate('2026-01-00')).toBe(false);
  });

  // `monthOf` è uno `slice(0, 7)`: senza padding la spesa finirebbe nel mese «2026-9».
  it('pretende lo zero davanti a mese e giorno', () => {
    expect(isIsoDate('2026-9-13')).toBe(false);
    expect(isIsoDate('2026-09-3')).toBe(false);
  });

  it('rifiuta tutto ciò che non è un giorno civile', () => {
    expect(isIsoDate('')).toBe(false);
    expect(isIsoDate('oggi')).toBe(false);
    expect(isIsoDate('2026-09-13T10:00:00Z')).toBe(false);
    expect(isIsoDate('2026-09-13 ')).toBe(false);
    expect(isIsoDate('13/09/2026')).toBe(false);
    expect(isIsoDate('2026-09')).toBe(false);
  });
});

describe('assertIsoDate', () => {
  it('lascia passare una data valida', () => {
    expect(() => assertIsoDate('2026-09-13')).not.toThrow();
  });

  it('nomina il valore ricevuto, così l errore dice cosa è arrivato', () => {
    expect(() => assertIsoDate('2026-02-30')).toThrow(/2026-02-30/);
  });

  it('usa l etichetta passata da chi chiama', () => {
    expect(() => assertIsoDate('mai', 'data del pareggio')).toThrow(/data del pareggio/);
  });
});
