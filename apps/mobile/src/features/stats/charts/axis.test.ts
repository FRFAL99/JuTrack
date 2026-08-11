import { describe, expect, it } from 'vitest';
import { labelIndices, shortWeekdayLabel, weekdayName, WEEKDAY_NAMES } from './axis';

describe('weekdayName', () => {
  it('conta da lunedì, come dayOfWeek del core', () => {
    expect(weekdayName(0)).toBe('lunedì');
    expect(weekdayName(6)).toBe('domenica');
  });

  it('fuori dall’intervallo non solleva: restituisce la stringa vuota', () => {
    expect(weekdayName(7)).toBe('');
    expect(weekdayName(-1)).toBe('');
  });

  it('abbrevia a tre lettere', () => {
    expect(WEEKDAY_NAMES.map((_, i) => shortWeekdayLabel(i))).toEqual([
      'lun',
      'mar',
      'mer',
      'gio',
      'ven',
      'sab',
      'dom',
    ]);
  });
});

describe('labelIndices', () => {
  it('con pochi punti li etichetta tutti', () => {
    expect(labelIndices(4, 6)).toEqual([0, 1, 2, 3]);
  });

  it('il primo e l’ultimo ci sono sempre', () => {
    const picked = labelIndices(31, 5);
    expect(picked[0]).toBe(0);
    expect(picked[picked.length - 1]).toBe(30);
  });

  it('non supera il massimo richiesto', () => {
    expect(labelIndices(31, 5).length).toBeLessThanOrEqual(5);
    expect(labelIndices(365, 4).length).toBeLessThanOrEqual(4);
  });

  it('non restituisce due volte lo stesso indice', () => {
    const picked = labelIndices(7, 6);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('li distribuisce in ordine crescente', () => {
    const picked = labelIndices(31, 5);
    expect([...picked].sort((a, b) => a - b)).toEqual(picked);
  });

  it('una serie vuota non ha etichette', () => {
    expect(labelIndices(0, 5)).toEqual([]);
    expect(labelIndices(10, 0)).toEqual([]);
  });

  it('con una sola etichetta sceglie il primo punto', () => {
    expect(labelIndices(10, 1)).toEqual([0]);
  });
});
