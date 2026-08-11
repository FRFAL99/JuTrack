import { describe, expect, it } from 'vitest';
import { bandScale, linearScale, niceTicks } from './scale';

describe('linearScale', () => {
  it('mappa gli estremi sugli estremi', () => {
    const scale = linearScale([0, 100], [0, 200]);
    expect(scale(0)).toBe(0);
    expect(scale(50)).toBe(100);
    expect(scale(100)).toBe(200);
  });

  it('funziona con un intervallo rovesciato, come l asse y dell SVG', () => {
    // In SVG la y cresce verso il basso: il valore massimo va in cima, cioè a y piccola.
    const scale = linearScale([0, 100], [120, 0]);
    expect(scale(0)).toBe(120);
    expect(scale(100)).toBe(0);
  });

  it('un dominio piatto non divide per zero', () => {
    // Un NaN in un attributo SVG non disegna niente e non segnala niente: il grafico
    // sparirebbe senza che nulla lo dica.
    const scale = linearScale([500, 500], [0, 100]);
    expect(scale(500)).toBe(50);
    expect(Number.isNaN(scale(0))).toBe(false);
  });

  it('estrapola fuori dal dominio invece di tagliare', () => {
    expect(linearScale([0, 100], [0, 100])(150)).toBe(150);
  });
});

describe('bandScale', () => {
  it('divide la larghezza in bande uguali', () => {
    const band = bandScale(4, 400, 0);
    expect(band.step).toBe(100);
    expect(band.bandWidth).toBe(100);
    expect(band.at(0)).toBe(0);
    expect(band.at(3)).toBe(300);
  });

  it('lascia lo spazio del padding fra una barra e l altra', () => {
    const band = bandScale(2, 100, 0.2);
    expect(band.step).toBe(50);
    expect(band.bandWidth).toBe(40);
    expect(band.at(0)).toBe(5); // metà del vuoto per lato
  });

  it('mette il centro a metà banda, dove va l etichetta', () => {
    expect(bandScale(2, 100, 0.2).center(0)).toBe(25);
  });

  it('con zero bande resta usabile invece di dare NaN', () => {
    const band = bandScale(0, 300);
    expect(band.step).toBe(0);
    expect(band.bandWidth).toBe(0);
    expect(band.at(0)).toBe(0);
  });

  it('regge un padding fuori scala', () => {
    expect(bandScale(2, 100, 5).bandWidth).toBeGreaterThan(0);
    expect(bandScale(2, 100, -1).bandWidth).toBe(50);
  });
});

describe('niceTicks', () => {
  it('sceglie valori tondi, non l intervallo diviso in parti uguali', () => {
    // 0 · 3333 · 6667 · 10000 sarebbe ineccepibile e illeggibile.
    expect(niceTicks(0, 10000, 3)).toEqual([0, 5000, 10000]);
    expect(niceTicks(0, 800, 4)).toEqual([0, 200, 400, 600, 800]);
  });

  it('preferisce un passo tondo al numero esatto di tacche richieste', () => {
    // Chiedendone quattro su 0–10000 il passo tondo è 5000, che ne produce tre: meglio
    // tre valori leggibili che quattro da 2500.
    expect(niceTicks(0, 10000, 4)).toEqual([0, 5000, 10000]);
  });

  it('resta dentro l intervallo', () => {
    const ticks = niceTicks(120, 880, 4);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(120);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(880);
  });

  it('non accumula errori in virgola mobile', () => {
    // Senza arrotondamento al passo, qui comparirebbe 0.30000000000000004.
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6000000000000001, 0.8, 1].map(round));
  });

  it('un intervallo nullo dà una tacca sola', () => {
    expect(niceTicks(500, 500)).toEqual([500]);
  });

  it('regge estremi rovesciati', () => {
    expect(niceTicks(100, 0, 2)).toEqual([0, 50, 100]);
  });

  it('non gira all infinito su un intervallo enorme', () => {
    expect(niceTicks(0, 1e12, 4).length).toBeLessThan(1000);
  });

  it('restituisce vuoto su input non finiti', () => {
    expect(niceTicks(NaN, 10)).toEqual([]);
    expect(niceTicks(0, Infinity)).toEqual([]);
  });
});

/** Lo stesso arrotondamento al passo che fa `niceTicks`, per scrivere l'atteso leggibile. */
function round(value: number): number {
  return Math.round(value / 0.2) * 0.2;
}
