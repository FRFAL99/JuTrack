import { describe, expect, it } from 'vitest';
import { addDays, dayOfWeek, daysBetween, daysOfMonth, weekStart } from './calendar';

describe('dayOfWeek', () => {
  it('conta da lunedì', () => {
    // Il 10 agosto 2026 è un lunedì.
    expect(dayOfWeek('2026-08-10')).toBe(0);
    expect(dayOfWeek('2026-08-16')).toBe(6); // domenica
  });

  it('non si sposta di un giorno al cambio dell ora legale', () => {
    // In Italia l'ora legale finisce il 25 ottobre 2026. Con un `Date` costruito a
    // mezzanotte **locale** questa è la data in cui il giorno può scivolare indietro.
    expect(dayOfWeek('2026-10-25')).toBe(6); // domenica
    expect(dayOfWeek('2026-03-29')).toBe(6); // domenica, inizio dell'ora legale
  });

  it('ripiega su lunedì per una stringa che non è una data', () => {
    expect(dayOfWeek('non-una-data')).toBe(0);
  });
});

describe('addDays', () => {
  it('scavalca il confine di mese', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
  });

  it('torna indietro scavalcando l anno', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('conosce gli anni bisestili', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('attraversa il cambio dell ora legale senza perdere un giorno', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
  });

  it('lascia intatta una stringa che non è una data', () => {
    expect(addDays('boh', 1)).toBe('boh');
  });
});

describe('daysBetween', () => {
  it('include entrambi gli estremi', () => {
    expect(daysBetween('2026-08-01', '2026-08-03')).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ]);
  });

  it('un giorno solo dà un giorno solo', () => {
    expect(daysBetween('2026-08-01', '2026-08-01')).toEqual(['2026-08-01']);
  });

  it('un intervallo invertito dà l elenco vuoto invece di girare per sempre', () => {
    expect(daysBetween('2026-08-10', '2026-08-01')).toEqual([]);
  });

  it('copre un anno intero senza buchi', () => {
    expect(daysBetween('2026-01-01', '2026-12-31')).toHaveLength(365);
    expect(daysBetween('2028-01-01', '2028-12-31')).toHaveLength(366);
  });
});

describe('weekStart', () => {
  it('un lunedì è già l inizio della sua settimana', () => {
    expect(weekStart('2026-08-10')).toBe('2026-08-10');
  });

  it('la domenica appartiene alla settimana che comincia il lunedì prima', () => {
    // Il rischio di una settimana che comincia di domenica: l'ultimo giorno finirebbe
    // nella settimana successiva, e il totale settimanale sarebbe sfasato di un giorno.
    expect(weekStart('2026-08-16')).toBe('2026-08-10');
  });

  it('scavalca il mese all indietro', () => {
    expect(weekStart('2026-09-01')).toBe('2026-08-31');
  });
});

describe('daysOfMonth', () => {
  it('dà tutti i giorni del mese', () => {
    expect(daysOfMonth('2026-08')).toHaveLength(31);
    expect(daysOfMonth('2026-08')[0]).toBe('2026-08-01');
    expect(daysOfMonth('2026-08')[30]).toBe('2026-08-31');
  });

  it('conosce febbraio, bisestile compreso', () => {
    expect(daysOfMonth('2026-02')).toHaveLength(28);
    expect(daysOfMonth('2028-02')).toHaveLength(29);
  });
});
