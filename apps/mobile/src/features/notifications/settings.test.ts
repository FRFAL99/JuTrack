import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, serializeSettings } from './settings';

describe('parseSettings', () => {
  it('rilegge quello che ha scritto', () => {
    const settings = { reminder: true, budget: true, sync: true, backup: true };
    expect(parseSettings(serializeSettings(settings))).toEqual(settings);
  });

  it('parte da tutto spento quando non c è ancora niente', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(Object.values(DEFAULT_SETTINGS).every((on) => on === false)).toBe(true);
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
    expect(parseSettings('{"sync":1}').sync).toBe(false);
  });

  it('legge le chiavi una per una, e quella che manca vale spento', () => {
    // È ciò che ha permesso allo Step 33 di aggiungere la sua senza toccare le altre due,
    // e ciò che permette a un telefono aggiornato di leggere le impostazioni scritte prima.
    expect(parseSettings('{"reminder":true,"sync":true}')).toEqual({
      reminder: true,
      budget: false,
      sync: true,
      backup: false,
    });
  });

  it('le impostazioni scritte prima dello Step 43 si leggono senza il quarto avviso', () => {
    // Il caso vero di chi aggiorna: sul telefono c'è un JSON con tre chiavi, e il quarto
    // interruttore deve risultare spento invece di far cadere la lettura.
    expect(parseSettings('{"reminder":true,"budget":true,"sync":true}')).toEqual({
      reminder: true,
      budget: true,
      sync: true,
      backup: false,
    });
  });
});
