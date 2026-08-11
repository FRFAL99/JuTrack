import { describe, expect, it } from 'vitest';
import { squarify, type TreemapRect } from './treemap';

const AREA = { x: 0, y: 0, width: 400, height: 300 };

function overlap(a: TreemapRect, b: TreemapRect): boolean {
  const gapX = a.x + a.width <= b.x + 1e-9 || b.x + b.width <= a.x + 1e-9;
  const gapY = a.y + a.height <= b.y + 1e-9 || b.y + b.height <= a.y + 1e-9;
  return !(gapX || gapY);
}

const items = [
  { id: 'casa', value: 6000 },
  { id: 'cibo', value: 4000 },
  { id: 'svago', value: 1500 },
  { id: 'auto', value: 1000 },
  { id: 'altro', value: 500 },
];

describe('squarify', () => {
  it('copre l area senza sovrapporre rettangoli', () => {
    const rects = squarify(items, AREA);
    const covered = rects.reduce((sum, r) => sum + r.width * r.height, 0);
    expect(covered).toBeCloseTo(AREA.width * AREA.height, 6);

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlap(rects[i] as TreemapRect, rects[j] as TreemapRect)).toBe(false);
      }
    }
  });

  it('resta dentro l area assegnata', () => {
    for (const rect of squarify(items, { x: 10, y: 20, width: 200, height: 100 })) {
      expect(rect.x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(rect.x + rect.width).toBeLessThanOrEqual(210 + 1e-9);
      expect(rect.y + rect.height).toBeLessThanOrEqual(120 + 1e-9);
    }
  });

  it('dà a ciascuno un area proporzionale al valore', () => {
    const rects = squarify(items, AREA);
    const total = items.reduce((sum, i) => sum + i.value, 0);
    for (const rect of rects) {
      const expected = (rect.value / total) * AREA.width * AREA.height;
      expect(rect.width * rect.height).toBeCloseTo(expected, 6);
    }
  });

  it('mette il valore più grande per primo', () => {
    expect(squarify(items, AREA)[0]?.id).toBe('casa');
  });

  it('è deterministico anche a parità di valore', () => {
    // I due telefoni devono disegnare la stessa mappa: senza il tie-break sull'id
    // dipenderebbe dall'ordine di arrivo.
    const pari = [
      { id: 'zeta', value: 100 },
      { id: 'alfa', value: 100 },
    ];
    expect(squarify(pari, AREA).map((r) => r.id)).toEqual(['alfa', 'zeta']);
    expect(squarify([...pari].reverse(), AREA).map((r) => r.id)).toEqual(['alfa', 'zeta']);
  });

  it('produce rettangoli più vicini al quadrato di una suddivisione a strisce', () => {
    // È il motivo per cui l'algoritmo è squarified: un rettangolo lungo e sottile è
    // un'area che l'occhio non sa confrontare.
    const rects = squarify(items, AREA);
    const worst = Math.max(...rects.map((r) => Math.max(r.width / r.height, r.height / r.width)));
    expect(worst).toBeLessThan(4);
  });

  it('scarta i valori non positivi invece di disegnare aree nulle', () => {
    const rects = squarify(
      [
        { id: 'a', value: 100 },
        { id: 'b', value: 0 },
        { id: 'c', value: -50 },
      ],
      AREA,
    );
    expect(rects.map((r) => r.id)).toEqual(['a']);
  });

  it('un solo elemento prende tutta l area', () => {
    const rects = squarify([{ id: 'solo', value: 1 }], AREA);
    expect(rects[0]).toMatchObject({ x: 0, y: 0, width: 400, height: 300 });
  });

  it('senza elementi o senza spazio non solleva', () => {
    expect(squarify([], AREA)).toEqual([]);
    expect(squarify(items, { x: 0, y: 0, width: 0, height: 100 })).toEqual([]);
  });
});
