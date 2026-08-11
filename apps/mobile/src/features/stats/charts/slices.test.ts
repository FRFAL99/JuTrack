import { describe, expect, it } from 'vitest';
import { REST_KEY, topSlices, type Slice } from './slices';

function slice(key: string, valueCents: number): Slice {
  return { key, label: key, valueCents, color: '#000000' };
}

describe('topSlices', () => {
  it('con poche voci non raccoglie niente', () => {
    const slices = [slice('a', 300), slice('b', 200)];
    expect(topSlices(slices, 5, '#888888')).toEqual(slices);
  });

  it('raccoglie la coda in una voce sola', () => {
    const slices = [slice('a', 500), slice('b', 300), slice('c', 200), slice('d', 100)];
    const out = topSlices(slices, 3, '#888888');

    expect(out).toHaveLength(3);
    expect(out[2]?.key).toBe(REST_KEY);
    expect(out[2]?.label).toBe('Altre 2 voci');
  });

  it('la somma non cambia: la coda vale quanto le voci che sostituisce', () => {
    const slices = [slice('a', 500), slice('b', 333), slice('c', 201), slice('d', 99)];
    const before = slices.reduce((sum, s) => sum + s.valueCents, 0);
    const after = topSlices(slices, 3, '#888888').reduce((sum, s) => sum + s.valueCents, 0);

    expect(after).toBe(before);
  });

  it('non riordina: l’ordine deciso dalle aggregazioni resta quello', () => {
    const slices = [slice('a', 100), slice('b', 900), slice('c', 50), slice('d', 10)];
    const out = topSlices(slices, 3, '#888888');
    expect(out.map((s) => s.key)).toEqual(['a', 'b', REST_KEY]);
  });

  it('con esattamente `max` voci le tiene tutte invece di nasconderne una', () => {
    // Raccogliere una voce sola sotto «Altre 1 voci» perderebbe il suo nome per niente.
    const slices = [slice('a', 300), slice('b', 200), slice('c', 100)];
    expect(topSlices(slices, 3, '#888888')).toEqual(slices);
  });

  it('un massimo assurdo non produce una ciambella fatta di sola coda', () => {
    const slices = [slice('a', 300), slice('b', 200)];
    expect(topSlices(slices, 1, '#888888')).toEqual(slices);
    expect(topSlices(slices, 0, '#888888')).toEqual(slices);
  });

  it('senza fette non c’è niente da raccogliere', () => {
    expect(topSlices([], 5, '#888888')).toEqual([]);
  });
});
