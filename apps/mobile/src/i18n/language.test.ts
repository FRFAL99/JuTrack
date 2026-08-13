import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  isKnownLanguage,
  LANGUAGES,
  normalizeLanguage,
  resolveLanguage,
  systemLocale,
} from './language';

describe('normalizeLanguage', () => {
  it.each([
    ['en-GB', 'en'],
    ['en-US', 'en'],
    ['it_IT', 'it'],
    ['IT', 'it'],
    ['  en  ', 'en'],
  ])('riduce %s alla lingua %s', (raw, expected) => {
    // Le impostazioni di un telefono danno un tag BCP-47, non un codice di lingua: non
    // esiste un dizionario `en-GB` distinto da `en-US`, e trattarli come lingue diverse
    // vorrebbe dire non riconoscerne nessuna delle due.
    expect(normalizeLanguage(raw)).toBe(expected);
  });

  it.each([['de'], ['fr-FR'], [''], ['   '], ['-'], ['itt']])(
    'non riconosce %s, che non è fra le lingue dell app',
    (raw) => {
      expect(normalizeLanguage(raw)).toBeNull();
    },
  );

  it('non cade su quello che non è nemmeno una stringa', () => {
    // Il valore arriva anche dal profilo su disco, che potrebbe essere stato scritto da una
    // versione futura o corrotto: `loadProfile` filtra già, ma questa non deve dipenderne.
    expect(normalizeLanguage(null)).toBeNull();
    expect(normalizeLanguage(undefined)).toBeNull();
  });
});

describe('resolveLanguage', () => {
  it('la scelta esplicita batte la lingua del telefono', () => {
    // È l'unica delle tre sorgenti decisa da una persona. Un telefono in inglese non deve
    // rimettere in inglese chi ha appena scelto l'italiano.
    expect(resolveLanguage('it', 'en-US')).toBe('it');
    expect(resolveLanguage('en', 'it-IT')).toBe('en');
  });

  it('senza scelta prende la lingua del telefono', () => {
    expect(resolveLanguage(undefined, 'en-GB')).toBe('en');
    expect(resolveLanguage(null, 'it-IT')).toBe('it');
  });

  it('ripiega sul default se il telefono parla una lingua che non parliamo', () => {
    expect(resolveLanguage(undefined, 'de-DE')).toBe(DEFAULT_LANGUAGE);
  });

  it('ripiega sul default anche se non si sa niente del telefono', () => {
    // È il caso di un motore JS senza `Intl`: `systemLocale()` torna `null` invece di
    // sollevare, e l'app parte in italiano invece di non partire.
    expect(resolveLanguage(undefined, null)).toBe(DEFAULT_LANGUAGE);
  });

  it('ignora una scelta illeggibile invece di fermarsi lì', () => {
    // Un profilo scritto da una versione futura con una lingua che questa non ha ancora
    // deve comportarsi come un profilo senza scelta, non come un profilo rotto.
    expect(resolveLanguage('de', 'en-US')).toBe('en');
    expect(resolveLanguage('', 'en-US')).toBe('en');
  });
});

describe('elenco delle lingue', () => {
  it('contiene il default', () => {
    // Un default fuori dall'elenco sarebbe una lingua in cui l'app può trovarsi senza che
    // il selettore permetta di uscirne.
    expect(isKnownLanguage(DEFAULT_LANGUAGE)).toBe(true);
  });

  it('non ha codici né etichette ripetuti', () => {
    const codes = LANGUAGES.map((language) => language.code);
    const labels = LANGUAGES.map((language) => language.label);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('ha codici già normalizzati', () => {
    // Se un codice dell'elenco non sopravvivesse a `normalizeLanguage`, la pillola scelta
    // non risulterebbe mai quella in uso: `resolveLanguage` restituirebbe un valore diverso
    // da quello che il selettore confronta.
    for (const { code } of LANGUAGES) {
      expect(normalizeLanguage(code)).toBe(code);
    }
  });
});

describe('systemLocale', () => {
  it('non solleva mai, qualunque cosa risponda il motore', () => {
    // Sotto Node `Intl` c'è e la risposta è un tag vero; su Hermes senza `Intl` sarebbe
    // `null`. Quello che questo test fissa è che nessuno dei due casi arriva come eccezione
    // fino all'avvio dell'app.
    expect(() => systemLocale()).not.toThrow();
    const locale = systemLocale();
    expect(locale === null || typeof locale === 'string').toBe(true);
  });
});
