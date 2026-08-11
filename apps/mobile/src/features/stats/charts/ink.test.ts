import { describe, expect, it } from 'vitest';
import { inkOn } from './ink';

const LIGHT = '#FFFFFF';
const DARK = '#14141B';

describe('inkOn', () => {
  it('sui colori di categoria di default sceglie il contrasto migliore, e non è sempre il bianco', () => {
    // Gli otto di `state/seed.ts`, con la loro luminanza relativa accanto. Sembrano tutti
    // scuri, ma quattro reggono meglio una scritta scura: è la ragione per cui questa
    // funzione esiste invece di un `#FFFFFF` fisso nel treemap.
    expect(inkOn('#2B8A3E')).toBe(LIGHT); // Spesa, 0,190
    expect(inkOn('#1971C2')).toBe(LIGHT); // Casa, 0,159
    expect(inkOn('#7048E8')).toBe(LIGHT); // Trasporti, 0,139
    expect(inkOn('#C2255C')).toBe(LIGHT); // Salute, 0,136

    expect(inkOn('#E8590C')).toBe(DARK); // Ristoranti, 0,243
    expect(inkOn('#0891B2')).toBe(DARK); // Svago, 0,235
    expect(inkOn('#C07F10')).toBe(DARK); // Viaggi, 0,264
    expect(inkOn('#868E96')).toBe(DARK); // Altro, 0,266
  });

  it('scrive scuro su un fondo chiaro', () => {
    expect(inkOn('#FFFFFF')).toBe(DARK);
    expect(inkOn('#FFE066')).toBe(DARK);
  });

  it('scrive chiaro sul nero', () => {
    expect(inkOn('#000000')).toBe(LIGHT);
  });

  it('accetta la forma a tre cifre', () => {
    expect(inkOn('#fff')).toBe(DARK);
    expect(inkOn('#000')).toBe(LIGHT);
  });

  it('un colore illeggibile non fa saltare il grafico', () => {
    expect(inkOn('')).toBe(LIGHT);
    expect(inkOn('rosso')).toBe(LIGHT);
    expect(inkOn('#12')).toBe(LIGHT);
  });
});
