import { describe, expect, it } from 'vitest';
import type { ImportCounts, ImportSkip } from '@jutrack/core';
import { describeKept, groupSkips, keptTotal, suggestedName } from './summary';

function counts(patch: Partial<ImportCounts> = {}): ImportCounts {
  return { expenses: 0, categories: 0, members: 0, budgets: 0, settlements: 0, ...patch };
}

function skip(reason: string, id = 'x'): ImportSkip {
  return { kind: 'expense', id, reason };
}

describe('describeKept', () => {
  it('elenca solo le famiglie che hanno qualcosa dentro', () => {
    expect(describeKept(counts({ expenses: 12, members: 2 }))).toBe('12 spese, 2 persone');
  });

  it('non scrive «0 pareggi»: un elenco di zeri fa cercare un problema che non c’è', () => {
    expect(describeKept(counts({ expenses: 3 }))).toBe('3 spese');
  });

  it('usa il singolare quando è uno solo', () => {
    expect(describeKept(counts({ expenses: 1, members: 1, categories: 1 }))).toBe(
      '1 spesa, 1 persona, 1 categoria',
    );
  });

  it('«budget» non cambia al plurale', () => {
    expect(describeKept(counts({ budgets: 4 }))).toBe('4 budget');
    expect(describeKept(counts({ budgets: 1 }))).toBe('1 budget');
  });

  it('dice «niente» invece di una stringa vuota', () => {
    expect(describeKept(counts())).toBe('niente');
  });

  it('mette le spese per prime: sono la cosa che si cerca', () => {
    expect(describeKept(counts({ expenses: 1, settlements: 1 }))).toMatch(/^1 spesa/);
  });
});

describe('keptTotal', () => {
  it('somma tutte e cinque le famiglie', () => {
    expect(keptTotal(counts({ expenses: 3, members: 2, budgets: 1 }))).toBe(6);
  });

  it('zero significa che non c’è niente da importare', () => {
    expect(keptTotal(counts())).toBe(0);
  });
});

describe('groupSkips', () => {
  it('raggruppa per motivo invece di elencare ogni record', () => {
    expect(
      groupSkips([skip('manca la data'), skip('manca la data'), skip('importo negativo')]),
    ).toEqual([
      { reason: 'manca la data', count: 2 },
      { reason: 'importo negativo', count: 1 },
    ]);
  });

  it('ordina per numerosità decrescente', () => {
    const grouped = groupSkips([skip('raro'), skip('comune'), skip('comune'), skip('comune')]);
    expect(grouped[0]).toEqual({ reason: 'comune', count: 3 });
  });

  it('a parità di numero ordina alfabeticamente, così due letture danno la stessa lista', () => {
    expect(groupSkips([skip('zeta'), skip('alfa')])).toEqual([
      { reason: 'alfa', count: 1 },
      { reason: 'zeta', count: 1 },
    ]);
  });

  it('nessuno scarto dà una lista vuota', () => {
    expect(groupSkips([])).toEqual([]);
  });
});

describe('suggestedName', () => {
  it('usa la data dell’export, che è ciò che distingue due file dello stesso vault', () => {
    expect(suggestedName('2026-08-04T10:00:00.000Z')).toBe('Importato del 4/8/2026');
  });

  it('ripiega sul nome generico se il file non dice quando è stato prodotto', () => {
    expect(suggestedName(null)).toBe('Gruppo importato');
  });

  it('ripiega anche su una data illeggibile, invece di scrivere «Invalid Date»', () => {
    expect(suggestedName('non è una data')).toBe('Gruppo importato');
  });
});
