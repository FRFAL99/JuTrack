import { describe, expect, it } from 'vitest';
import { parseExpense } from './draft';
import { isEmptyQuestion, parseQuery, type ExpenseQuestion } from './query';
import type { ParseContext } from './types';

/** Lo stesso gruppo della tabella di `draft.test.ts`, martedì 15 settembre 2026. */
const context: ParseContext = {
  today: '2026-09-15',
  members: [
    { id: 'm1', name: 'Fra', color: '#4c8bf5' },
    { id: 'm2', name: 'Giulia', color: '#e0645a' },
  ],
  myMemberId: 'm1',
  categories: [
    { id: 'c1', name: 'Spesa', icon: '🛒', color: '#4c8bf5', archived: false },
    { id: 'c2', name: 'Casa', icon: '🏠', color: '#7bc67b', archived: false },
  ],
  stores: ['Esselunga', 'Conad'],
  tags: ['regalo', 'vacanza'],
};

/** La domanda su una riga: periodo, filtri, avanzo. */
function riassunto(question: ExpenseQuestion): string {
  const period = question.period;
  const when = period === null ? '-' : (period.preset ?? `${period.from}..${period.to}`);
  const f = question.filters;
  const parts = [
    f.categoryIds === undefined ? '' : `cat=${f.categoryIds.join('+')}`,
    f.stores === undefined ? '' : `neg=${f.stores.join('+')}`,
    f.tags === undefined ? '' : `tag=${f.tags.join('+')}`,
    f.memberId === undefined ? '' : `chi=${f.memberId}/${f.personMode ?? ''}`,
    f.minCents === undefined ? '' : `min=${f.minCents}`,
    f.maxCents === undefined ? '' : `max=${f.maxCents}`,
  ].filter((part) => part !== '');
  return [
    when,
    parts.length === 0 ? '-' : parts.join(' '),
    question.note === '' ? '-' : question.note,
  ].join(' | ');
}

const ask = (text: string): ExpenseQuestion => parseQuery(text, context);

/**
 * Le domande vere.
 *
 * Come la tabella delle frasi in `draft.test.ts`, ed è il posto in cui si aggiunge la
 * domanda che un giorno non funzionerà.
 */
const TABELLA: [domanda: string, esito: string][] = [
  // La frase del criterio di «fatto»: tre chip, e niente nell'avanzo.
  ['spesa da esselunga questo mese', 'thisMonth | cat=c1 neg=Esselunga | -'],
  // …e la seconda parte del criterio: la soglia si aggiunge, e non nomina un periodo.
  ['sopra i 50', '- | min=5000 | -'],

  // Periodi.
  ['questo mese', 'thisMonth | - | -'],
  ['mese scorso', 'lastMonth | - | -'],
  ['ultimi 7 giorni', 'last7 | - | -'],
  ['ultimi 15 giorni', '2026-09-01..2026-09-15 | - | -'],
  ['ad agosto', '2026-08-01..2026-08-31 | - | -'],
  ["l'anno scorso", '2025-01-01..2025-12-31 | - | -'],
  ['nel 2025', '2025-01-01..2025-12-31 | - | -'],

  // Soglie.
  ['sotto i 20', '- | max=2000 | -'],
  ['fra 10 e 50', '- | min=1000 max=5000 | -'],
  ['fra 50 e 10', '- | min=1000 max=5000 | -'],
  ['sopra i 50 euro', '- | min=5000 | -'],
  ['piu di 30', '- | min=3000 | -'],
  // Quattro cifre: senza le soglie prima del periodo, «2000» diventerebbe un anno.
  ['sopra i 2000', '- | min=200000 | -'],

  // Le parole del gruppo, con gli stessi riconoscitori della spesa.
  ['esselunga', '- | neg=Esselunga | -'],
  ['casa', '- | cat=c2 | -'],
  ['regalo vacanza', '- | tag=regalo+vacanza | -'],
  ['conad sopra i 30 questo mese', 'thisMonth | neg=Conad min=3000 | -'],

  // Persone: il modo cambia con il marcatore.
  ['pagate da Giulia', '- | chi=m2/paid | -'],
  ['a carico di Giulia', '- | chi=m2/owed | -'],
  ['casa a carico di me', '- | cat=c2 chi=m1/owed | -'],

  // Un numero nudo non vuol dire niente in una domanda, e resta un avanzo.
  ['50', '- | - | 50'],
  ['boh', '- | - | boh'],
  ['', '- | - | -'],
  ['quanto ho speso da esselunga', '- | neg=Esselunga | quanto ho speso'],
];

describe('parseQuery, sulle domande vere', () => {
  for (const [domanda, atteso] of TABELLA) {
    it(`«${domanda}»`, () => {
      expect(riassunto(ask(domanda))).toBe(atteso);
    });
  }
});

describe('la stessa grammatica, due domande diverse', () => {
  it('riconosce gli stessi negozi e le stesse categorie delle spese', () => {
    // Il vincolo della decisione 10: il tokenizzatore, il lessico e i riconoscitori di
    // parole sono condivisi **per davvero**. Se `parseQuery` ne riscrivesse uno, questo
    // test lo direbbe.
    const frase = 'spesa esselunga regalo';
    const spesa = parseExpense(frase, context);
    const domanda = parseQuery(frase, context);

    expect(domanda.filters.stores).toEqual([spesa.store]);
    expect(domanda.filters.categoryIds).toEqual([spesa.categoryId]);
    expect(domanda.filters.tags).toEqual(spesa.tags);
  });

  it('legge lo stesso numero in due modi opposti', () => {
    // In una spesa «25» è l'importo; in una domanda è una soglia, e solo se marcato.
    expect(parseExpense('spesa 25', context).amountCents).toBe(2500);
    expect(parseQuery('spesa 25', context).filters.minCents).toBeUndefined();
    expect(parseQuery('spesa sopra i 25', context).filters.minCents).toBe(2500);
  });

  it('legge un mese da solo come periodo, e non come data di una spesa', () => {
    expect(parseExpense('spesa agosto', context).date).toBeNull();
    expect(parseQuery('spesa agosto', context).period?.from).toBe('2026-08-01');
  });
});

describe('i segni sulla domanda', () => {
  it('puntano i caratteri esatti che hanno prodotto ogni filtro', () => {
    const domanda = 'spesa da esselunga questo mese';
    const question = parseQuery(domanda, context);
    expect(question.marks.map((m) => [m.field, domanda.slice(m.start, m.end)])).toEqual([
      ['category', 'spesa'],
      ['store', 'da esselunga'],
      ['period', 'questo mese'],
    ]);
  });

  it('sono in ordine di comparsa', () => {
    const question = parseQuery('conad sopra i 30 questo mese', context);
    const starts = question.marks.map((mark) => mark.start);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
  });
});

describe('isEmptyQuestion', () => {
  it('è la guardia che impedisce a mezza frase di svuotare la schermata', () => {
    expect(isEmptyQuestion(ask(''))).toBe(true);
    expect(isEmptyQuestion(ask('quanto ho'))).toBe(true);
    expect(isEmptyQuestion(ask('quanto ho speso a'))).toBe(true);
    expect(isEmptyQuestion(ask('questo mese'))).toBe(false);
  });
});

describe('la domanda non inventa niente', () => {
  it('non filtra su un negozio che il gruppo non conosce', () => {
    const question = ask('spese da zio Piero');
    expect(question.filters.stores).toBeUndefined();
    expect(question.note).toBe('spese da zio Piero');
  });

  it('non deduce una persona senza marcatore', () => {
    expect(ask('Giulia').filters.memberId).toBeUndefined();
  });

  it('non nomina mai un periodo nel futuro', () => {
    for (const [domanda] of TABELLA) {
      const { period } = ask(domanda);
      if (period !== null && period.to !== null) expect(period.to <= context.today).toBe(true);
    }
  });
});
