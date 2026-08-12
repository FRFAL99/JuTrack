import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from './settings';

describe('parseSettings', () => {
  it('rilegge quello che ha scritto', () => {
    const settings = { reminder: true, budget: true };
    expect(parseSettings(serializeSettings(settings))).toEqual(settings);
  });

  it('parte da tutto spento quando non c è ancora niente', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.reminder).toBe(false);
    expect(DEFAULT_SETTINGS.budget).toBe(false);
  });

  it.each([
    ['non è JSON', 'non-json'],
    ['non è un oggetto', '"acceso"'],
    ['è null', 'null'],
  ])('ripiega su spento se il valore %s', (_caso, raw) => {
    // La direzione dell'errore conta: ripiegare su «acceso» farebbe comparire notifiche
    // che nessuno ha chiesto, e un avviso di troppo si nota molto più di uno mancante.
    expect(parseSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });

  it('accetta solo il booleano vero, non un valore che gli somiglia', () => {
    expect(parseSettings('{"reminder":"true"}').reminder).toBe(false);
    expect(parseSettings('{"reminder":1}').reminder).toBe(false);
    expect(parseSettings('{"budget":"true"}').budget).toBe(false);
  });

  it('legge le chiavi una per una, così lo Step 33 può aggiungere la propria', () => {
    // Un campo sconosciuto non fa cadere il resto, e un campo mancante vale spento: è ciò
    // che permette a un telefono con le impostazioni di oggi di leggere quelle di domani.
    expect(parseSettings('{"reminder":true,"sync":true}')).toEqual({
      reminder: true,
      budget: false,
    });
  });
});
