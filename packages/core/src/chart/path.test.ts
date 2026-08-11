import { describe, expect, it } from 'vitest';
import { arcPath, areaPath, linePath, smoothLinePath, type Point } from './path';

/** Tutti i numeri che compaiono nel tracciato, per controllarne gli estremi. */
function numbersIn(path: string): number[] {
  return (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

/** Solo le ordinate: nei comandi usati qui i numeri si alternano x,y. */
function ysIn(path: string): number[] {
  return numbersIn(path).filter((_, i) => i % 2 === 1);
}

describe('linePath', () => {
  it('unisce i punti con una spezzata', () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 5, y: 0 },
      ]),
    ).toBe('M0,10 L5,0');
  });

  it('toglie gli zeri inutili dai decimali', () => {
    expect(linePath([{ x: 1.005, y: 2.5 }])).toBe('M1,2.5');
  });

  it('senza punti dà la stringa vuota, che l SVG ignora', () => {
    expect(linePath([])).toBe('');
  });
});

describe('areaPath', () => {
  it('chiude la spezzata sulla linea di base', () => {
    const path = areaPath(
      [
        { x: 0, y: 10 },
        { x: 10, y: 4 },
      ],
      20,
    );
    expect(path).toBe('M0,10 L10,4 L10,20 L0,20 Z');
  });

  it('senza punti dà la stringa vuota', () => {
    expect(areaPath([], 100)).toBe('');
  });
});

describe('smoothLinePath', () => {
  it('con meno di tre punti è una spezzata', () => {
    expect(smoothLinePath([{ x: 0, y: 0 }])).toBe('M0,0');
    expect(
      smoothLinePath([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]),
    ).toBe('M0,0 L1,1');
  });

  it('non scende sotto la linea di base fra due minimi', () => {
    // Il caso che condanna la spline naturale: due mesi bassi e uno alto. Una spline
    // scavalcherebbe i punti e scenderebbe sotto lo zero, disegnando una spesa negativa
    // in un mese in cui si è speso poco.
    //
    // Una cubica di Bézier sta dentro l'inviluppo convesso dei suoi quattro punti di
    // controllo: se nessuna ordinata del tracciato esce dall'intervallo dei dati, la
    // curva non ne esce.
    const points: Point[] = [
      { x: 0, y: 100 }, // in SVG y grande = valore basso
      { x: 10, y: 100 },
      { x: 20, y: 0 }, // il picco
      { x: 30, y: 100 },
      { x: 40, y: 100 },
    ];
    const ys = ysIn(smoothLinePath(points));
    expect(Math.max(...ys)).toBeLessThanOrEqual(100);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });

  it('non scavalca nemmeno su una salita a gradino', () => {
    const points: Point[] = [
      { x: 0, y: 50 },
      { x: 10, y: 50 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
    ];
    const ys = ysIn(smoothLinePath(points));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...ys)).toBeLessThanOrEqual(50);
  });

  it('passa per il primo e per l ultimo punto', () => {
    const path = smoothLinePath([
      { x: 0, y: 5 },
      { x: 10, y: 20 },
      { x: 20, y: 8 },
    ]);
    expect(path.startsWith('M0,5')).toBe(true);
    expect(path.endsWith('20,8')).toBe(true);
  });

  it('resta una serie di cubiche, una per intervallo', () => {
    const path = smoothLinePath([
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 4 },
    ]);
    expect(path.match(/C/g) ?? []).toHaveLength(3);
  });

  it('non produce NaN con due punti sulla stessa ascissa', () => {
    const path = smoothLinePath([
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 5 },
    ]);
    expect(path).not.toContain('NaN');
  });

  it('una serie tutta piatta resta piatta', () => {
    const ys = ysIn(
      smoothLinePath([
        { x: 0, y: 7 },
        { x: 10, y: 7 },
        { x: 20, y: 7 },
      ]),
    );
    expect(ys.every((y) => y === 7)).toBe(true);
  });
});

describe('arcPath', () => {
  it('disegna uno spicchio di ciambella con arco esterno e interno', () => {
    const path = arcPath(50, 50, 40, 20, 0, Math.PI / 2);
    expect(path.startsWith('M50,10')).toBe(true); // ore dodici, raggio esterno
    expect(path.match(/A/g) ?? []).toHaveLength(2);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('con raggio interno zero fa una fetta di torta, dal centro', () => {
    const path = arcPath(50, 50, 40, 0, 0, Math.PI / 2);
    expect(path.startsWith('M50,50')).toBe(true);
    expect(path.match(/A/g) ?? []).toHaveLength(1);
  });

  it('marca l arco maggiore oltre il mezzo giro', () => {
    expect(arcPath(0, 0, 10, 5, 0, Math.PI * 1.5)).toContain(' 1 1 ');
    expect(arcPath(0, 0, 10, 5, 0, Math.PI * 0.5)).toContain(' 0 1 ');
  });

  it('spezza il giro completo in due archi, che altrimenti non si disegnerebbe', () => {
    const path = arcPath(0, 0, 10, 5, 0, Math.PI * 2);
    expect((path.match(/A/g) ?? []).length).toBeGreaterThan(2);
  });

  it('uno spicchio vuoto non disegna niente', () => {
    expect(arcPath(0, 0, 10, 5, 1, 1)).toBe('');
    expect(arcPath(0, 0, 0, 0, 0, 1)).toBe('');
  });
});
