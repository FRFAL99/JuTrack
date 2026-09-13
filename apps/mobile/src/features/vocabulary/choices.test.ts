import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import type { Expense, VocabularyEntry } from '@jutrack/core';
import { missingFromCatalog, suggestedNames, vocabularyChoices } from './choices';

function entry(key: string, name: string, kind: 'tag' | 'store' = 'tag'): VocabularyEntry {
  return { kind, key, name, deletedAt: null };
}

function expense(tags: string[], store = ''): Expense {
  return {
    id: tags.join('-') + store,
    amountCents: 100,
    currency: 'EUR',
    date: '2026-08-01',
    categoryId: null,
    note: '',
    store,
    tags,
    paidBy: 'a',
    split: { mode: 'single', shares: { a: 100 } },
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    deletedAt: null,
  };
}

beforeEach(async () => {
  await i18n.changeLanguage('it');
});

describe('suggestedNames', () => {
  it('propone dei tag, e nessun negozio', () => {
    expect(suggestedNames('tag')).toContain('Buoni pasto');
    expect(suggestedNames('tag')).toContain('Vacanza');
    // Un negozio è un nome proprio e locale: una lista nel bundle proporrebbe catene
    // italiane a chi apre l'app in inglese.
    expect(suggestedNames('store')).toEqual([]);
  });

  it('sono tradotti', async () => {
    await i18n.changeLanguage('en');
    expect(suggestedNames('tag')).toContain('Meal vouchers');
    await i18n.changeLanguage('it');
  });
});

describe('missingFromCatalog', () => {
  it('elenca le parole usate dalle spese che non stanno in elenco', () => {
    const spese = [expense(['Vacanza']), expense(['Regalo'])];
    expect(missingFromCatalog('tag', [entry('vacanza', 'Vacanza')], spese)).toEqual(['Regalo']);
  });

  // Il caso vero del giorno in cui il catalogo entra: elenco vuoto, spese piene.
  it('con l elenco vuoto restituisce tutto ciò che le spese usano', () => {
    const spese = [expense(['Vacanza', 'Regalo'])];
    expect(missingFromCatalog('tag', [], spese).sort()).toEqual(['Regalo', 'Vacanza']);
  });

  it('confronta sulla chiave e non sulla grafia', () => {
    const spese = [expense(['vacanza'])];
    expect(missingFromCatalog('tag', [entry('vacanza', 'Vacanza')], spese)).toEqual([]);
  });

  it('guarda la famiglia giusta', () => {
    const spese = [expense(['Vacanza'], 'Esselunga')];
    expect(missingFromCatalog('store', [], spese)).toEqual(['Esselunga']);
    expect(missingFromCatalog('tag', [], spese)).toEqual(['Vacanza']);
  });
});

describe('vocabularyChoices', () => {
  it('mette in cima le scelte, poi l elenco, poi le orfane', () => {
    const scelte = vocabularyChoices(
      'tag',
      [entry('casa', 'Casa')],
      ['Regalo'],
      [expense(['Ufficio'])],
    );
    expect(scelte.map((one) => one.name)).toEqual(['Regalo', 'Casa', 'Ufficio']);
  });

  it('dice quali voci sono in elenco e quali no', () => {
    const scelte = vocabularyChoices('tag', [entry('casa', 'Casa')], [], [expense(['Ufficio'])]);
    expect(scelte).toEqual([
      { name: 'Casa', key: 'casa', inCatalog: true },
      { name: 'Ufficio', key: 'ufficio', inCatalog: false },
    ]);
  });

  /**
   * Una voce scelta con una grafia e in elenco con un'altra è **una** pillola.
   *
   * Due sarebbero due modi di scegliere la stessa cosa, e toccarne una non spegnerebbe
   * l'altra.
   */
  it('non ripete una voce scelta che l elenco scrive diversamente', () => {
    const scelte = vocabularyChoices('tag', [entry('regalo', 'regalo')], ['Regalo'], []);
    expect(scelte).toHaveLength(1);
    // Vince la grafia scelta nella spesa: è quella che l'utente sta guardando.
    expect(scelte[0]?.name).toBe('Regalo');
    // Ed è comunque riconosciuta come voce dell'elenco, non come orfana.
    expect(scelte[0]?.inCatalog).toBe(true);
  });

  it('una voce tolta dall elenco ma usata dalla spesa resta scegliibile', () => {
    // `entries` arriva già senza tombstone da `listVocabulary`.
    const scelte = vocabularyChoices('tag', [], ['Vacanza'], []);
    expect(scelte).toEqual([{ name: 'Vacanza', key: 'vacanza', inCatalog: false }]);
  });
});
