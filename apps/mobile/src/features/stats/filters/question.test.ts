import { describe, expect, it } from 'vitest';
import type { ParseContext } from '@jutrack/core';
import type { QueryFacets } from './facets';
import { mergeFacets, readQuestion } from './question';

/** Martedì 15 settembre 2026, un gruppo di due con un vocabolario già usato. */
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
  tags: ['regalo'],
};

const ask = (text: string) => readQuestion(text, context, '2026-09-15');

describe('il periodo', () => {
  it('resta un preset quando la frase ne nomina uno', () => {
    // Un preset si muove col calendario e porta l'etichetta che il chip mostra: ridurlo a
    // due date butterebbe via proprio l'informazione che si vede.
    expect(ask('questo mese').period).toEqual({
      id: 'thisMonth',
      from: '2026-09-01',
      to: '2026-09-15',
    });
    expect(ask('ultimi 7 giorni').period?.id).toBe('last7');
  });

  it('diventa un intervallo scelto a mano quando la frase nomina un mese preciso', () => {
    expect(ask('ad agosto').period).toEqual({
      id: 'custom',
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('è null quando la frase non ne nomina nessuno: quello di prima non si tocca', () => {
    expect(ask('sopra i 50').period).toBeNull();
    expect(ask('esselunga').period).toBeNull();
  });
});

describe('i filtri', () => {
  it('portano le stesse chiavi che i chip sanno già mostrare', () => {
    expect(ask('spesa da esselunga questo mese').facets).toEqual({
      categoryIds: ['c1'],
      stores: ['Esselunga'],
    });
  });

  it('leggono le soglie', () => {
    expect(ask('sopra i 50').facets).toEqual({ minCents: 5000 });
    expect(ask('fra 10 e 50').facets).toEqual({ minCents: 1000, maxCents: 5000 });
  });

  it('leggono chi ha pagato e chi ha a carico', () => {
    expect(ask('pagate da Giulia').facets).toEqual({ memberId: 'm2', personMode: 'paid' });
    expect(ask('a carico di Giulia').facets).toEqual({ memberId: 'm2', personMode: 'owed' });
  });
});

describe('understood', () => {
  it('è falso su mezza frase, ed è la guardia che non svuota la schermata', () => {
    // Applicare comunque il risultato di «quanto ho sp» toglierebbe i filtri di prima, e
    // una schermata vuota si legge come un guasto dell'app.
    expect(ask('quanto ho sp').understood).toBe(false);
    expect(ask('').understood).toBe(false);
    expect(ask('boh').understood).toBe(false);
  });

  it('è vero appena qualcosa è stato riconosciuto', () => {
    expect(ask('questo mese').understood).toBe(true);
    expect(ask('esselunga').understood).toBe(true);
    expect(ask('sopra i 50').understood).toBe(true);
  });

  it('dice cosa non ha capito', () => {
    expect(ask('quanto ho speso da esselunga').note).toBe('quanto ho speso');
  });
});

describe('mergeFacets', () => {
  it('aggiunge invece di sostituire', () => {
    // Il criterio di «fatto» dello step: dopo «spesa da esselunga questo mese» si scrive
    // «sopra i 50» e ci si aspetta che resti tutto il resto.
    const prima: QueryFacets = { categoryIds: ['c1'], stores: ['Esselunga'] };
    expect(mergeFacets(prima, ask('sopra i 50').facets)).toEqual({
      categoryIds: ['c1'],
      stores: ['Esselunga'],
      minCents: 5000,
    });
  });

  it('sovrascrive solo la chiave che la frase nomina davvero', () => {
    const prima: QueryFacets = { stores: ['Conad'], minCents: 1000 };
    expect(mergeFacets(prima, ask('esselunga').facets)).toEqual({
      stores: ['Esselunga'],
      minCents: 1000,
    });
  });

  it('su una frase che non dice niente lascia tutto com era', () => {
    const prima: QueryFacets = { categoryIds: ['c1'], minCents: 1000 };
    expect(mergeFacets(prima, ask('boh').facets)).toEqual(prima);
  });

  it('non modifica l oggetto di partenza', () => {
    const prima: QueryFacets = { stores: ['Conad'] };
    mergeFacets(prima, ask('sopra i 50').facets);
    expect(prima).toEqual({ stores: ['Conad'] });
  });
});

describe('i segni', () => {
  it('arrivano fino al componente, per evidenziare la frase', () => {
    const domanda = 'spesa da esselunga questo mese';
    const marks = ask(domanda).marks;
    expect(marks.map((mark) => domanda.slice(mark.start, mark.end))).toEqual([
      'spesa',
      'da esselunga',
      'questo mese',
    ]);
  });
});
