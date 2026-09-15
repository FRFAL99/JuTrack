import { describe, expect, it } from 'vitest';
import { isEmptyDraft, parseExpense } from './draft';
import type { ExpenseDraft, ParseContext } from './types';

/**
 * Un gruppo di due, martedì 15 settembre 2026, con un vocabolario già usato.
 *
 * Il vocabolario è la ragione per cui questa tabella dice qualcosa: la grammatica **non
 * inventa niente**, quindi senza negozi e tag già visti riconoscerebbe soltanto numeri e
 * date.
 */
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
    { id: 'c3', name: 'Trasporti', icon: '🚌', color: '#e0645a', archived: false },
    { id: 'c4', name: 'Ristorante', icon: '🍝', color: '#f5b74c', archived: false },
  ],
  stores: ['Esselunga', 'Conad', 'Mercato Centrale'],
  tags: ['regalo', 'vacanza'],
};

/**
 * Una bozza su una riga: importo, data, categoria, negozio, tag, chi paga, divisione, nota.
 *
 * `-` è «non compilato», `??` è «due numeri nudi, non si indovina». Una riga sola per
 * bozza serve a tenere leggibile la tabella qui sotto: quaranta asserzioni scritte per
 * campo sarebbero quaranta schermate.
 */
function riassunto(draft: ExpenseDraft): string {
  return [
    draft.amountCents === null ? (draft.amountAmbiguous ? '??' : '-') : String(draft.amountCents),
    draft.date ?? '-',
    draft.categoryId ?? '-',
    draft.store === '' ? '-' : draft.store,
    draft.tags.length === 0 ? '-' : draft.tags.join('+'),
    draft.paidBy ?? '-',
    draft.split === null
      ? '-'
      : draft.split.mode === 'single'
        ? `single:${draft.split.memberId ?? ''}`
        : draft.split.mode,
    draft.note === '' ? '-' : draft.note,
  ].join(' | ');
}

/**
 * Le frasi vere, dalla più secca a quella che non si capisce.
 *
 * **È il posto in cui si vede se la grammatica serve**, ed è il posto in cui si aggiunge la
 * frase che un giorno non funzionerà: prima la riga, poi il riconoscitore.
 */
const TABELLA: [frase: string, bozza: string][] = [
  // Solo la cifra: il caso più frequente, e quello che il tastierino già copriva.
  ['25', '2500 | - | - | - | - | - | - | -'],
  ['25€', '2500 | - | - | - | - | - | - | -'],
  ['12,50', '1250 | - | - | - | - | - | - | -'],
  ['1.234,56 affitto', '123456 | - | - | - | - | - | - | affitto'],

  // La frase del criterio di «fatto»: tutti i campi insieme, niente nella nota.
  ['25 spesa esselunga ieri metà a te', '2500 | 2026-09-14 | c1 | Esselunga | - | - | equal | -'],
  // …e il caso normale, che non è un fallimento.
  ['cena con i suoi 40', '4000 | - | - | - | - | - | - | cena con i suoi'],

  // Negozio e categoria, in ordine libero.
  ['spesa esselunga 60', '6000 | - | c1 | Esselunga | - | - | - | -'],
  ['60 esselunga', '6000 | - | - | Esselunga | - | - | - | -'],
  ['conad 32,40 oggi', '3240 | 2026-09-15 | - | Conad | - | - | - | -'],
  ['15 trasporti', '1500 | - | c3 | - | - | - | - | -'],
  ['mercato centrale 14 spesa', '1400 | - | c1 | Mercato Centrale | - | - | - | -'],
  ['MERCATO CENTRALE 14', '1400 | - | - | Mercato Centrale | - | - | - | -'],
  ['esselunga  spesa   ieri  25', '2500 | 2026-09-14 | c1 | Esselunga | - | - | - | -'],

  // Divisione.
  ['ristorante 80 metà', '8000 | - | c4 | - | - | - | equal | -'],
  ['80 ristorante a metà', '8000 | - | c4 | - | - | - | equal | -'],
  ['vacanza 200 tutto io', '20000 | - | - | - | vacanza | - | single:m1 | -'],
  ['taxi 22 trasporti tutto a Giulia', '2200 | - | c3 | - | - | - | single:m2 | taxi'],

  // Chi ha pagato: serve un marcatore, sempre.
  ['benzina 45 trasporti pagato da Giulia', '4500 | - | c3 | - | - | m2 | - | benzina'],
  ['offro io 60 ristorante', '6000 | - | c4 | - | - | m1 | - | -'],
  ['paga te 60 ristorante', '6000 | - | c4 | - | - | m2 | - | -'],
  ['io pago la spesa 45', '4500 | - | c1 | - | - | m1 | - | la'],
  ['35 spesa esselunga pagata da me', '3500 | - | c1 | Esselunga | - | m1 | - | -'],
  // Senza marcatore un nome resta un nome: nessun saldo si muove per una preposizione.
  ['30 regalo per Giulia', '3000 | - | - | - | regalo | - | - | per Giulia'],

  // Tag.
  ['30 regalo', '3000 | - | - | - | regalo | - | - | -'],
  ['regalo vacanza 60 conad', '6000 | - | - | Conad | regalo+vacanza | - | - | -'],

  // Date, in tutte le forme che ha il lessico.
  ['18 spesa venerdì', '1800 | 2026-09-11 | c1 | - | - | - | - | -'],
  ['18 spesa venerdì scorso', '1800 | 2026-09-11 | c1 | - | - | - | - | -'],
  ['25 spesa martedì', '2500 | 2026-09-15 | c1 | - | - | - | - | -'],
  ['22 conad 3/9', '2200 | 2026-09-03 | - | Conad | - | - | - | -'],
  ['22 conad il 3', '2200 | 2026-09-03 | - | Conad | - | - | - | -'],
  ["22 conad l'8", '2200 | 2026-09-08 | - | Conad | - | - | - | -'],
  ['9,90 spesa 3 agosto', '990 | 2026-08-03 | c1 | - | - | - | - | -'],
  ['50 casa 2026-08-31', '5000 | 2026-08-31 | c2 | - | - | - | - | -'],
  ['affitto 700 il 1', '70000 | 2026-09-01 | - | - | - | - | - | affitto'],
  // «domani» non è nel lessico e non ci sarà: una spesa nel futuro entrerebbe nei grafici
  // del mese senza che nessuno l'abbia chiesta.
  ['domani 25 spesa', '2500 | - | c1 | - | - | - | - | domani'],

  // Due numeri nudi: non si sceglie, e lo si dichiara. Un segno di valuta scioglie il nodo.
  ['birra 5 10', '?? | - | - | - | - | - | - | birra 5 10'],
  ['birra 5 10€', '1000 | - | - | - | - | - | - | birra 5'],

  // Parole che il gruppo non conosce: restano parole.
  ['pizza da Michele 25', '2500 | - | - | - | - | - | - | pizza da Michele'],
  ['un caffè al bar 1,20', '120 | - | - | - | - | - | - | un caffè al bar'],
  [
    'spesa settimanale esselunga 87,30 ieri metà',
    '8730 | 2026-09-14 | c1 | Esselunga | - | - | equal | settimanale',
  ],

  // E le due frasi che non dicono niente.
  ['boh', '- | - | - | - | - | - | - | boh'],
  ['', '- | - | - | - | - | - | - | -'],
];

describe('parseExpense, su quarantadue frasi vere', () => {
  for (const [frase, atteso] of TABELLA) {
    it(`«${frase}»`, () => {
      expect(riassunto(parseExpense(frase, context))).toBe(atteso);
    });
  }
});

describe('i segni sulla frase', () => {
  it('puntano i caratteri esatti che hanno prodotto ogni campo', () => {
    // Il test che smaschera un riconoscitore ingordo: si asserisce **quali** caratteri
    // hanno prodotto un campo, non solo che il campo sia giusto.
    const frase = '25 spesa esselunga ieri metà a te';
    const draft = parseExpense(frase, context);
    const pezzi = draft.marks.map((mark) => [mark.field, frase.slice(mark.start, mark.end)]);
    expect(pezzi).toEqual([
      ['amount', '25'],
      ['category', 'spesa'],
      ['store', 'esselunga'],
      ['date', 'ieri'],
      ['split', 'metà a te'],
    ]);
  });

  it('restano allineati anche con due spazi di fila', () => {
    // La trappola per cui si tokenizza sul testo originale: normalizzando prima, questi
    // estremi punterebbero i caratteri sbagliati — e solo in frasi come questa.
    const frase = 'esselunga  spesa   ieri  25';
    const draft = parseExpense(frase, context);
    for (const mark of draft.marks) {
      expect(frase.slice(mark.start, mark.end).trim()).toBe(frase.slice(mark.start, mark.end));
    }
    const perCampo = new Map(draft.marks.map((m) => [m.field, frase.slice(m.start, m.end)]));
    expect(perCampo.get('store')).toBe('esselunga');
    expect(perCampo.get('amount')).toBe('25');
  });

  it('non toccano la nota: un segno vuol dire «questo l ho capito»', () => {
    const draft = parseExpense('cena con i suoi 40', context);
    expect(draft.marks).toHaveLength(1);
    expect(draft.marks[0]?.field).toBe('amount');
  });

  it('sono in ordine di comparsa', () => {
    const draft = parseExpense('25 spesa esselunga ieri metà a te', context);
    const inizi = draft.marks.map((mark) => mark.start);
    expect([...inizi].sort((a, b) => a - b)).toEqual(inizi);
  });
});

describe('la bozza non inventa niente', () => {
  it('una frase di parole mai viste non produce né negozio né tag', () => {
    // Il vincolo della decisione 2, scritto come test: nessuna bozza può contenere un
    // negozio o un tag la cui chiave non esisteva già prima della frase.
    const draft = parseExpense('pranzo da zio Piero al lago di Garda', context);
    expect(draft.store).toBe('');
    expect(draft.tags).toEqual([]);
    expect(draft.categoryId).toBeNull();
    expect(draft.note).toBe('pranzo da zio Piero al lago di Garda');
  });

  it('senza vocabolario riconosce solo ciò che non dipende dal gruppo', () => {
    const vuoto: ParseContext = { ...context, stores: [], tags: [], categories: [] };
    const draft = parseExpense('25 spesa esselunga ieri', vuoto);
    expect(draft.amountCents).toBe(2500);
    expect(draft.date).toBe('2026-09-14');
    expect(draft.note).toBe('spesa esselunga');
  });

  it('non data mai una spesa nel futuro', () => {
    for (const [frase] of TABELLA) {
      const { date } = parseExpense(frase, context);
      if (date !== null) expect(date <= context.today).toBe(true);
    }
  });

  it('conserva la frase di partenza, che è ciò che serve quando qualcosa non torna', () => {
    expect(parseExpense('  25  ', context).text).toBe('  25  ');
  });
});

describe('isEmptyDraft', () => {
  it('è vera finché non è stato capito niente', () => {
    expect(isEmptyDraft(parseExpense('', context))).toBe(true);
    expect(isEmptyDraft(parseExpense('cena con', context))).toBe(true);
    expect(isEmptyDraft(parseExpense('cena con 12', context))).toBe(false);
  });
});
