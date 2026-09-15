import { describe, expect, it } from 'vitest';
import {
  parseExpense,
  type Category,
  type Expense,
  type ExpenseDraft,
  type Member,
  type ParseContext,
  type VocabularyEntry,
} from '@jutrack/core';
import {
  draftPills,
  highlight,
  payerOf,
  sentenceAvailable,
  sentenceContext,
  sentenceHint,
  splitModeOf,
} from './sentence';

const fra: Member = { id: 'm1', name: 'Fra', color: '#4c8bf5' };
const giulia: Member = { id: 'm2', name: 'Giulia', color: '#e0645a' };

const categories: Category[] = [
  { id: 'c1', name: 'Spesa', icon: '🛒', color: '#4c8bf5', archived: false },
  { id: 'c2', name: 'Casa', icon: '🏠', color: '#7bc67b', archived: false },
];

function entry(kind: 'store' | 'tag', name: string): VocabularyEntry {
  return { kind, key: name.toLowerCase(), name, deletedAt: null };
}

function expense(fields: Partial<Expense>): Expense {
  return {
    id: 'e1',
    amountCents: 1000,
    currency: '€',
    date: '2026-09-10',
    categoryId: null,
    note: '',
    store: '',
    tags: [],
    paidBy: 'm1',
    split: { mode: 'equal', shares: { m1: 500, m2: 500 } },
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    deletedAt: null,
    ...fields,
  };
}

const sources = {
  today: '2026-09-15',
  members: [fra, giulia],
  myMemberId: 'm1',
  categories,
  storeEntries: [entry('store', 'Esselunga')],
  tagEntries: [entry('tag', 'regalo')],
  expenses: [expense({ store: 'Conad', tags: ['vacanza'] })],
};

const labels = { categories, members: [fra, giulia], myMemberId: 'm1', symbol: '€' };

/** Il contesto di prova, e la bozza che se ne ricava. */
const context: ParseContext = sentenceContext(sources);
const draftOf = (text: string): ExpenseDraft => parseExpense(text, context);

describe('sentenceContext', () => {
  it('riconosce sia l elenco del gruppo sia le parole già usate nelle spese', () => {
    // È il vincolo che tiene: ciò che il form propone come pillola, la frase deve poterlo
    // scrivere. Un elenco diverso qui produrrebbe una parola scrivibile e non proponibile,
    // o il contrario, e nessuno dei due si nota finché non capita.
    expect(context.stores).toEqual(['Esselunga', 'Conad']);
    expect(context.tags).toEqual(['regalo', 'vacanza']);
  });

  it('porta il gruppo dentro senza rimaneggiarlo', () => {
    expect(context.today).toBe('2026-09-15');
    expect(context.myMemberId).toBe('m1');
    expect(context.members).toHaveLength(2);
  });

  it('non conta due volte una parola che sta in elenco e anche in una spesa', () => {
    const doppia = sentenceContext({
      ...sources,
      expenses: [expense({ store: 'esselunga' })],
    });
    expect(doppia.stores).toEqual(['Esselunga']);
  });
});

describe('draftPills', () => {
  it('dice il valore, non la parola scritta', () => {
    // «ieri» diventa la data vera, «25» diventa 25,00 €: è ciò che le pillole aggiungono
    // rispetto alla frase colorata qui sopra.
    const pills = draftPills(draftOf('25 spesa esselunga ieri metà a te'), labels);
    expect(pills.map((pill) => pill.label)).toEqual([
      '25,00 €',
      'Ieri',
      'Spesa',
      'Esselunga',
      'Metà e metà',
    ]);
  });

  it('porta il colore della categoria, e solo quello', () => {
    const pills = draftPills(draftOf('25 casa'), labels);
    expect(pills.find((pill) => pill.field === 'category')?.color).toBe('#7bc67b');
    expect(pills.find((pill) => pill.field === 'amount')?.color).toBeUndefined();
  });

  it('chiama per nome chi paga, e «tu» quando sono io', () => {
    expect(draftPills(draftOf('offro io 60'), labels).at(-1)?.label).toBe('Paghi tu');
    expect(draftPills(draftOf('60 pagato da Giulia'), labels).at(-1)?.label).toBe('Paga Giulia');
  });

  it('fa una pillola per tag', () => {
    const pills = draftPills(draftOf('regalo vacanza 60'), labels);
    expect(pills.filter((pill) => pill.field === 'tag').map((pill) => pill.label)).toEqual([
      'regalo',
      'vacanza',
    ]);
  });

  it('non elenca i campi vuoti: una frase non capita non produce pillole', () => {
    expect(draftPills(draftOf('cena con i suoi'), labels)).toEqual([]);
  });

  it('dà a ogni pillola una chiave sua', () => {
    const pills = draftPills(draftOf('25 spesa esselunga ieri regalo vacanza metà'), labels);
    expect(new Set(pills.map((pill) => pill.key)).size).toBe(pills.length);
  });
});

describe('highlight', () => {
  it('rimette in fila esattamente la frase scritta', () => {
    // Il test che impedisce a un carattere di sparire a schermo: i pezzi sono un taglio del
    // testo originale, non una sua riscrittura.
    for (const frase of [
      '25 spesa esselunga ieri metà a te',
      'esselunga  spesa   ieri  25',
      'cena con i suoi 40',
      '',
      '   ',
    ]) {
      expect(
        highlight(draftOf(frase))
          .map((piece) => piece.text)
          .join(''),
      ).toBe(frase);
    }
  });

  it('segna col proprio campo i pezzi capiti, e lascia gli altri senza', () => {
    const pieces = highlight(draftOf('25 spesa esselunga ieri metà a te'));
    expect(pieces.map((piece) => [piece.field, piece.text])).toEqual([
      ['amount', '25'],
      [null, ' '],
      ['category', 'spesa'],
      [null, ' '],
      ['store', 'esselunga'],
      [null, ' '],
      ['date', 'ieri'],
      [null, ' '],
      ['split', 'metà a te'],
    ]);
  });

  it('su una frase che nessuno ha capito dà un pezzo solo', () => {
    expect(highlight(draftOf('cena con i suoi'))).toEqual([
      { text: 'cena con i suoi', field: null },
    ]);
  });
});

describe('sentenceHint', () => {
  it('tace quando non c è niente da dire', () => {
    expect(sentenceHint(draftOf('25 spesa'))).toBeNull();
    expect(sentenceHint(draftOf('cena con i suoi'))).toBeNull();
  });

  it('parla solo per i due numeri nudi', () => {
    expect(sentenceHint(draftOf('birra 5 10'))).toContain('due numeri');
  });
});

describe('payerOf', () => {
  it('senza bozza resta il default di sempre', () => {
    expect(payerOf(undefined, 'm1')).toBe('m1');
    expect(payerOf(draftOf('25 spesa'), 'm1')).toBe('m1');
  });

  it('legge il marcatore esplicito', () => {
    expect(payerOf(draftOf('60 pagato da Giulia'), 'm1')).toBe('m2');
  });

  it('«tutto a Giulia» dice anche chi ha pagato, quando nient altro lo dice', () => {
    // Nel modello dell'app `single` mette la spesa a carico di **chi paga**: è l'unica
    // lettura che il form sa rappresentare, ed è quella giusta nel caso frequente.
    expect(payerOf(draftOf('22 tutto a Giulia'), 'm1')).toBe('m2');
    expect(payerOf(draftOf('22 tutto io'), 'm2')).toBe('m1');
  });

  it('un marcatore esplicito vince sul «tutto»', () => {
    expect(payerOf(draftOf('22 pagato da Giulia tutto io'), 'm2')).toBe('m2');
  });

  it('una divisione a metà non nomina nessun pagante', () => {
    expect(payerOf(draftOf('22 metà'), 'm1')).toBe('m1');
  });
});

describe('splitModeOf', () => {
  it('senza bozza, e senza divisione nella frase, resta il default', () => {
    expect(splitModeOf(undefined, 'equal')).toBe('equal');
    expect(splitModeOf(draftOf('25 spesa'), 'single')).toBe('single');
  });

  it('legge il modo che la frase dichiara', () => {
    expect(splitModeOf(draftOf('25 a metà'), 'single')).toBe('equal');
    expect(splitModeOf(draftOf('25 tutto io'), 'equal')).toBe('single');
  });
});

describe('sentenceAvailable', () => {
  it('è vera solo in italiano, perché il lessico è uno solo', () => {
    expect(sentenceAvailable('it')).toBe(true);
    expect(sentenceAvailable('it-IT')).toBe(true);
    expect(sentenceAvailable('en')).toBe(false);
    expect(sentenceAvailable('en-GB')).toBe(false);
  });
});
