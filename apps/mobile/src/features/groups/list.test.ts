import { describe, expect, it } from 'vitest';
import { groupSubtitle, shortVaultId } from './list';

const CASA = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const VIAGGIO = '0f9e8d7c6b5a49382716f5e4d3c2b1a0';

describe('shortVaultId', () => {
  it('accorcia il vault a otto caratteri con l ellissi', () => {
    expect(shortVaultId(CASA)).toBe('a1b2c3d4…');
  });

  it('non aggiunge l ellissi a un id già corto', () => {
    // Non capita con i vault veri, che sono 32 esadecimali, ma «abc…» sarebbe una
    // troncatura annunciata e non avvenuta.
    expect(shortVaultId('abc')).toBe('abc');
  });
});

describe('groupSubtitle', () => {
  it('segnala il gruppo aperto', () => {
    expect(groupSubtitle(CASA, CASA)).toBe('Aperto adesso');
  });

  it('mostra il vault abbreviato per gli altri', () => {
    expect(groupSubtitle(VIAGGIO, CASA)).toBe('vault 0f9e8d7c…');
  });

  it('senza gruppo aperto nessuno è «Aperto adesso»', () => {
    // Il caso dello Step 21: al primo avvio non esiste alcun gruppo corrente.
    expect(groupSubtitle(CASA, null)).toBe('vault a1b2c3d4…');
  });
});
