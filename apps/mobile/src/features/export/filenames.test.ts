import { describe, expect, it } from 'vitest';
import { exportFileName, localDateStamp } from './filenames';

describe('localDateStamp', () => {
  it('impagina mese e giorno a due cifre', () => {
    expect(localDateStamp(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('usa la data locale, non UTC', () => {
    // Le 23:30 del 1° agosto in Italia sono già il 2 agosto in UTC: nel nome del file
    // deve comparire il giorno che l'utente ha davanti, non quello del meridiano zero.
    expect(localDateStamp(new Date(2026, 7, 1, 23, 30))).toBe('2026-08-01');
  });
});

describe('exportFileName', () => {
  it('compone nome, data ed estensione', () => {
    expect(exportFileName('spese', 'csv', new Date(2026, 7, 1))).toBe(
      'jutrack-spese-2026-08-01.csv',
    );
  });

  it('è stabile a parità di giorno: due export si sovrascrivono in cache', () => {
    const morning = exportFileName('vault', 'json', new Date(2026, 7, 1, 8));
    const evening = exportFileName('vault', 'json', new Date(2026, 7, 1, 20));
    expect(morning).toBe(evening);
  });
});
