import { describe, expect, it } from 'vitest';
import { assessPassphrase, countWords, MIN_PASSPHRASE_LENGTH } from './passphrase';

describe('countWords', () => {
  it('conta le parole separate da spazi', () => {
    expect(countWords('gatto lampada fiume tazza')).toBe(4);
  });

  it('non si fa ingannare dagli spazi ripetuti o ai bordi', () => {
    expect(countWords('  gatto   lampada  ')).toBe(2);
  });

  it('una stringa vuota non contiene parole', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('assessPassphrase', () => {
  it('blocca sotto la lunghezza minima e dice quanti caratteri mancano', () => {
    const result = assessPassphrase('corta');
    expect(result.level).toBe('troppo-corta');
    expect(result.acceptable).toBe(false);
    expect(result.message).toContain(String(MIN_PASSPHRASE_LENGTH - 5));
  });

  it('accetta esattamente alla soglia', () => {
    expect(assessPassphrase('a'.repeat(MIN_PASSPHRASE_LENGTH)).acceptable).toBe(true);
  });

  it('promuove quattro parole lunghe a robusta', () => {
    expect(assessPassphrase('gatto lampada fiume tazza').level).toBe('robusta');
  });

  it('chiama debole una parola sola, pur lunga abbastanza da passare', () => {
    const result = assessPassphrase('sesamoapriti');
    expect(result.level).toBe('debole');
    // Debole ma non bloccata: la scelta resta all'utente, avvisato.
    expect(result.acceptable).toBe(true);
  });

  it('considera accettabile una frase lunga di poche parole', () => {
    expect(assessPassphrase('unafrasedavverolunghissima').level).toBe('accettabile');
  });

  it('ignora gli spazi ai bordi nel misurare la lunghezza', () => {
    expect(assessPassphrase('   corta   ').level).toBe('troppo-corta');
  });
});
