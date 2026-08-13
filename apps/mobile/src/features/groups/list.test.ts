import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { groupColor, groupSubtitle, shortVaultId } from './list';

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

  it('arricchisce il gruppo aperto con spese e totale del mese', () => {
    expect(groupSubtitle(CASA, CASA, { expenseCount: 2, monthTotal: '119,00 €' })).toBe(
      'Aperto adesso · 2 spese · 119,00 € questo mese',
    );
  });

  it('mette la spesa al singolare', () => {
    expect(groupSubtitle(CASA, CASA, { expenseCount: 1, monthTotal: '9,00 €' })).toBe(
      'Aperto adesso · 1 spesa · 9,00 € questo mese',
    );
  });

  it('dice «nessuna spesa» invece di «0 spese»', () => {
    expect(groupSubtitle(CASA, CASA, { expenseCount: 0, monthTotal: '0,00 €' })).toBe(
      'Aperto adesso · nessuna spesa · 0,00 € questo mese',
    );
  });

  it('ignora le statistiche su un gruppo che non è quello aperto', () => {
    // Un solo documento Yjs è montato per volta: le statistiche appartengono al gruppo
    // corrente, e attribuirle a un altro sarebbe un numero sbagliato accanto al nome
    // giusto — il tipo di errore che nessuno verificherebbe guardando lo schermo.
    expect(groupSubtitle(VIAGGIO, CASA, { expenseCount: 2, monthTotal: '119,00 €' })).toBe(
      'vault 0f9e8d7c…',
    );
  });
});

describe('groupColor', () => {
  it('dà sempre lo stesso colore allo stesso gruppo', () => {
    // È ciò che rende il colore utile: se cambiasse fra un avvio e l'altro, o fra i due
    // telefoni, non distinguerebbe niente.
    expect(groupColor(CASA)).toBe(groupColor(CASA));
  });

  it('restituisce un colore esadecimale', () => {
    expect(groupColor(CASA)).toMatch(/^#[0-9A-F]{6}$/i);
    expect(groupColor(VIAGGIO)).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('non esplode su un id vuoto o non esadecimale', () => {
    // Nessun `vaultId` vero è così, ma un ripiego che sollevi trasformerebbe un colore
    // mancante nella schermata che non si apre.
    expect(groupColor('')).toMatch(/^#[0-9A-F]{6}$/i);
    expect(groupColor('zz')).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('distribuisce i gruppi su più di un colore', () => {
    const colors = new Set(
      ['00', '01', '02', '03', '04', '05'].map((prefix) => groupColor(`${prefix}${CASA.slice(2)}`)),
    );
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('in inglese', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('traduce lo stato e il contorno, non l id del vault', () => {
    // «vault» resta «vault»: è il nome della cosa, lo stesso che portano le tabelle e il
    // threat model. Tradurlo sarebbe stato tradurre un identificatore.
    expect(groupSubtitle(CASA, CASA)).toBe('Open now');
    expect(groupSubtitle(VIAGGIO, CASA)).toBe('vault 0f9e8d7c…');
  });

  it('sceglie singolare e plurale delle spese', () => {
    const stats = (expenseCount: number) => ({ expenseCount, monthTotal: '119,00 €' });
    expect(groupSubtitle(CASA, CASA, stats(1))).toBe('Open now · 1 expense · 119,00 € this month');
    expect(groupSubtitle(CASA, CASA, stats(2))).toBe('Open now · 2 expenses · 119,00 € this month');
  });

  it('dice a parole che non ce ne sono, invece di scrivere zero', () => {
    expect(groupSubtitle(CASA, CASA, { expenseCount: 0, monthTotal: '0,00 €' })).toContain(
      'no expenses',
    );
  });
});
