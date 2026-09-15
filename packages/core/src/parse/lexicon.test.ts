import { describe, expect, it } from 'vitest';
import { ITALIAN_LEXICON } from './lexicon';
import { fold } from './tokens';
import type { Lexicon } from './types';

/** Tutte le voci del lessico, qualunque sia la forma del campo che le contiene. */
function voci(lexicon: Lexicon): string[] {
  const dirette = [
    lexicon.today,
    lexicon.yesterday,
    lexicon.beforeYesterday,
    lexicon.dayPrefixes,
    lexicon.past,
    lexicon.currency,
    lexicon.equalSplit,
    lexicon.wholeSplit,
    lexicon.toward,
    lexicon.paid,
    lexicon.by,
    lexicon.me,
    lexicon.you,
  ].flat();
  return [...dirette, ...lexicon.weekdays.flat(), ...lexicon.months.flat()];
}

describe('ITALIAN_LEXICON', () => {
  it('ha ogni voce già ripiegata', () => {
    // La trappola silenziosa: una voce scritta «metà» non verrebbe mai riconosciuta,
    // perché i token arrivano qui senza accenti — e non si vedrebbe alcun errore, solo
    // una parola che non funziona.
    for (const voce of voci(ITALIAN_LEXICON)) {
      expect(fold(voce)).toBe(voce);
    }
  });

  it('non ha voci vuote né doppie dentro lo stesso campo', () => {
    for (const parole of [
      ITALIAN_LEXICON.today,
      ITALIAN_LEXICON.paid,
      ITALIAN_LEXICON.me,
      ITALIAN_LEXICON.you,
      ...ITALIAN_LEXICON.weekdays,
      ...ITALIAN_LEXICON.months,
    ]) {
      expect(parole.length).toBeGreaterThan(0);
      expect(new Set(parole).size).toBe(parole.length);
      expect(parole).not.toContain('');
    }
  });

  it('ha sette giorni e dodici mesi, nell ordine che il resto del core si aspetta', () => {
    // 0 = lunedì come `dayOfWeek`, 0 = gennaio come i mesi ISO: sbagliare l ordine qui
    // sposterebbe ogni data di un giorno o di un mese, senza rompere niente.
    expect(ITALIAN_LEXICON.weekdays).toHaveLength(7);
    expect(ITALIAN_LEXICON.weekdays[0]).toContain('lunedi');
    expect(ITALIAN_LEXICON.months).toHaveLength(12);
    expect(ITALIAN_LEXICON.months[0]).toContain('gennaio');
    expect(ITALIAN_LEXICON.months[11]).toContain('dicembre');
  });

  it('non fa dire la stessa cosa a due campi che si escludono', () => {
    const pronomi = new Set(ITALIAN_LEXICON.me);
    for (const parola of ITALIAN_LEXICON.you) expect(pronomi.has(parola)).toBe(false);
    for (const parola of ITALIAN_LEXICON.equalSplit) {
      expect(ITALIAN_LEXICON.wholeSplit).not.toContain(parola);
    }
  });
});
