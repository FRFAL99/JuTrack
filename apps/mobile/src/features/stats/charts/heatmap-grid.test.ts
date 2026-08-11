import { describe, expect, it } from 'vitest';
import type { HeatmapCell } from '@jutrack/core';
import { levelThresholds, weekColumns } from './heatmap-grid';

function cell(date: string, totalCents: number, level: number): HeatmapCell {
  return { date, totalCents, count: totalCents === 0 ? 0 : 1, level };
}

describe('weekColumns', () => {
  it('mette il lunedì in cima e apre una colonna per settimana', () => {
    // 2026-08-03 è un lunedì: due settimane piene fanno due colonne.
    const days = Array.from({ length: 14 }, (_, i) =>
      cell(`2026-08-${String(3 + i).padStart(2, '0')}`, 100, 1),
    );
    const columns = weekColumns(days);

    expect(columns).toHaveLength(2);
    expect(columns[0]?.[0]?.date).toBe('2026-08-03');
    expect(columns[0]?.[6]?.date).toBe('2026-08-09');
    expect(columns[1]?.[0]?.date).toBe('2026-08-10');
  });

  it('lascia i buchi in testa quando il periodo non comincia di lunedì', () => {
    // 2026-08-01 è un sabato: la prima colonna ha solo le ultime due righe.
    const days = [cell('2026-08-01', 500, 1), cell('2026-08-02', 0, 0), cell('2026-08-03', 700, 2)];
    const columns = weekColumns(days);

    expect(columns).toHaveLength(2);
    expect(columns[0]?.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(columns[0]?.[5]?.date).toBe('2026-08-01');
    expect(columns[0]?.[6]?.date).toBe('2026-08-02');
    // Il lunedì apre la colonna nuova anche se la precedente non è piena.
    expect(columns[1]?.[0]?.date).toBe('2026-08-03');
  });

  it('lascia i buchi in coda quando il periodo finisce a metà settimana', () => {
    const columns = weekColumns([cell('2026-08-03', 100, 1), cell('2026-08-04', 100, 1)]);
    expect(columns).toHaveLength(1);
    expect(columns[0]?.slice(2)).toEqual([null, null, null, null, null]);
  });

  it('un periodo vuoto non ha colonne', () => {
    expect(weekColumns([])).toEqual([]);
  });
});

describe('levelThresholds', () => {
  it('dice da quale importo comincia ciascun livello', () => {
    const thresholds = levelThresholds([
      cell('2026-08-01', 0, 0),
      cell('2026-08-02', 500, 1),
      cell('2026-08-03', 800, 1),
      cell('2026-08-04', 2000, 2),
      cell('2026-08-05', 5000, 3),
      cell('2026-08-06', 9000, 4),
    ]);

    expect(thresholds).toEqual([500, 2000, 5000, 9000]);
  });

  it('il livello zero non ha soglia: non compare fra i quattro', () => {
    const thresholds = levelThresholds([cell('2026-08-01', 0, 0), cell('2026-08-02', 300, 1)]);
    expect(thresholds[0]).toBe(300);
  });

  it('un livello che nessun giorno raggiunge resta senza soglia', () => {
    const thresholds = levelThresholds([cell('2026-08-01', 400, 1)]);
    expect(thresholds).toEqual([400, null, null, null]);
  });

  it('un periodo senza spese non inventa soglie', () => {
    expect(levelThresholds([])).toEqual([null, null, null, null]);
  });
});
