import { describe, expect, it } from 'vitest';
import { initialOf, splitAvatars } from './avatar';

describe('initialOf', () => {
  it('prende la prima lettera, maiuscola', () => {
    expect(initialOf('Francesco')).toBe('F');
    expect(initialOf('juju')).toBe('J');
  });

  it('ignora gli spazi in testa', () => {
    expect(initialOf('  Anna')).toBe('A');
  });

  it('non spezza un carattere fuori dal piano base', () => {
    // `'🐸'[0]` sarebbe mezza coppia surrogata, e a schermo un rombo col punto
    // interrogativo. Vale anche per gli alfabeti che stanno oltre U+FFFF.
    expect(initialOf('🐸 Rana')).toBe('🐸');
    expect(Array.from(initialOf('🐸 Rana'))).toHaveLength(1);
  });

  it('ripiega su ? quando il nome è vuoto', () => {
    // Succede davvero: il nome del profilo si salva sul blur, quindi fra il campo
    // svuotato e il rientro il membro si chiama «».
    expect(initialOf('')).toBe('?');
    expect(initialOf('   ')).toBe('?');
  });
});

describe('splitAvatars', () => {
  it('mostra tutti quando ci stanno', () => {
    expect(splitAvatars(['a', 'b'], 4)).toEqual({ visible: ['a', 'b'], overflow: 0 });
    expect(splitAvatars(['a', 'b', 'c', 'd'], 4)).toEqual({
      visible: ['a', 'b', 'c', 'd'],
      overflow: 0,
    });
  });

  it('libera un posto per il conteggio quando non ci stanno', () => {
    // Cinque persone in quattro posti: tre cerchi e un «+2», non quattro e un «+1»,
    // che occuperebbe un posto in più dicendo una cosa in meno.
    expect(splitAvatars(['a', 'b', 'c', 'd', 'e'], 4)).toEqual({
      visible: ['a', 'b', 'c'],
      overflow: 2,
    });
  });

  it('conta le persone nascoste, non quelle totali', () => {
    const { visible, overflow } = splitAvatars(['a', 'b', 'c', 'd', 'e', 'f'], 3);
    expect(visible).toEqual(['a', 'b']);
    expect(overflow).toBe(4);
    expect(visible.length + overflow).toBe(6);
  });

  it('regge gli estremi', () => {
    expect(splitAvatars([], 4)).toEqual({ visible: [], overflow: 0 });
    expect(splitAvatars(['a', 'b'], 0)).toEqual({ visible: [], overflow: 2 });
  });
});
