import { describe, expect, it } from 'vitest';
import { darkPalette, fontSize, lightPalette, radius, type Palette } from './tokens';

/**
 * Luminanza relativa (WCAG) di un colore `#RRGGBB`.
 *
 * Serve solo a ordinare i grigi fra loro: confrontare le stringhe esadecimali non
 * funzionerebbe appena un token smettesse di essere un grigio puro.
 */
function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

describe('palette', () => {
  it('definisce gli stessi token sul chiaro e sullo scuro', () => {
    // Un token aggiunto a una palette sola passerebbe il typecheck solo finché
    // l'altra non viene toccata: qui il buco si vede subito.
    expect(Object.keys(lightPalette).sort()).toEqual(Object.keys(darkPalette).sort());
  });

  it('tiene ogni colore in forma #RRGGBB', () => {
    // Dallo Step 34 non è più solo una convenzione: il widget Android vuole i colori nel
    // tipo `#${string}`, e il cast in `BalanceWidget.tsx` si fida di questa riga. Un
    // `rgba(…)` scritto qui compilerebbe in tutta l'app e finirebbe sulla home come un
    // colore che il launcher non sa leggere. `luminance`, qui sopra, dà per vero lo stesso.
    const all = [...Object.values(lightPalette), ...Object.values(darkPalette)];
    expect(all.filter((color) => !/^#[0-9A-Fa-f]{6}$/.test(color))).toEqual([]);
  });

  it('tiene il fondo più scuro di ogni superficie sul tema scuro', () => {
    // È la ragione dei grigi nuovi: con fondo e superficie alla stessa luminanza le
    // card non si staccano e la gerarchia della schermata sparisce.
    expect(luminance(darkPalette.background)).toBeLessThan(luminance(darkPalette.surface));
    expect(luminance(darkPalette.surface)).toBeLessThan(luminance(darkPalette.surfaceRaised));
  });

  it('scala i tre livelli di testo dal più al meno leggibile', () => {
    // `textFaint` è per i metadati: se scivolasse sopra `textMuted` diventerebbe il
    // testo secondario, e i due token direbbero la stessa cosa.
    const ordered = (p: Palette, direction: 1 | -1): boolean =>
      direction * (luminance(p.text) - luminance(p.textMuted)) > 0 &&
      direction * (luminance(p.textMuted) - luminance(p.textFaint)) > 0;

    expect(ordered(darkPalette, 1)).toBe(true); // scuro: il testo pieno è il più chiaro
    expect(ordered(lightPalette, -1)).toBe(true); // chiaro: il testo pieno è il più scuro
  });
});

describe('scale', () => {
  it('resta ordinata dopo i gradini nuovi', () => {
    // `xxs` e `display` sono stati infilati agli estremi di una scala esistente.
    expect(Object.values(fontSize)).toEqual([...Object.values(fontSize)].sort((a, b) => a - b));
    expect(radius.lg).toBeLessThan(radius.xl);
  });
});
