import { describe, expect, it } from 'vitest';
import {
  centsToDecimal,
  escapeCsvField,
  expensesToCsv,
  neutralizeFormula,
  settlementsToCsv,
  shareColumnLabels,
  UTF8_BOM,
} from './csv';
import type { Expense, Member, Settlement, VaultSnapshot } from '../model/types';

function member(id: string, name: string): Member {
  return { id, name, color: '#000000' };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    amountCents: 2500,
    currency: 'EUR',
    date: '2026-07-04',
    categoryId: 'spesa',
    note: 'pane',
    store: 'Esselunga',
    tags: ['casa', 'settimanale'],
    paidBy: 'anna',
    split: { mode: 'equal', shares: { anna: 1250, bruno: 1250 } },
    createdAt: '2026-07-04T10:00:00.000Z',
    updatedAt: '2026-07-04T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

const snapshot: VaultSnapshot = {
  expenses: [expense()],
  categories: [{ id: 'spesa', name: 'Spesa', icon: '🛒', color: '#C2255C', archived: false }],
  members: [member('anna', 'Anna'), member('bruno', 'Bruno')],
  budgets: [],
  settlements: [],
};

/** Righe del CSV senza BOM, per confronti leggibili. */
function lines(csv: string): string[] {
  return csv.replace(UTF8_BOM, '').trimEnd().split('\r\n');
}

describe('centsToDecimal', () => {
  it('usa il punto come separatore e due decimali fissi', () => {
    expect(centsToDecimal(2500)).toBe('25.00');
    expect(centsToDecimal(5)).toBe('0.05');
    expect(centsToDecimal(123456)).toBe('1234.56');
  });

  it('non raggruppa le migliaia: un separatore in più confonderebbe il parser', () => {
    expect(centsToDecimal(100000000)).toBe('1000000.00');
  });

  it('porta il segno davanti', () => {
    expect(centsToDecimal(-1250)).toBe('-12.50');
  });

  it('rifiuta i float: un importo non intero è un bug a monte', () => {
    expect(() => centsToDecimal(12.5)).toThrow();
  });
});

describe('escapeCsvField', () => {
  it('lascia intatto un campo semplice', () => {
    expect(escapeCsvField('pane')).toBe('pane');
  });

  it('quota i campi con virgola, virgolette o a capo', () => {
    expect(escapeCsvField('pane, latte')).toBe('"pane, latte"');
    expect(escapeCsvField('a\nb')).toBe('"a\nb"');
  });

  it('raddoppia le virgolette interne, come vuole RFC 4180', () => {
    expect(escapeCsvField('il "grande" spuntino')).toBe('"il ""grande"" spuntino"');
  });
});

describe('neutralizeFormula', () => {
  it('disinnesca i caratteri che un foglio di calcolo valuterebbe', () => {
    expect(neutralizeFormula('=1+1')).toBe("'=1+1");
    expect(neutralizeFormula('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(neutralizeFormula('-cmd')).toBe("'-cmd");
  });

  it('non tocca il testo normale', () => {
    expect(neutralizeFormula('pane')).toBe('pane');
    expect(neutralizeFormula('costo 3-4 euro')).toBe('costo 3-4 euro');
  });
});

describe('shareColumnLabels', () => {
  it('usa il nome quando basta a distinguere', () => {
    expect(shareColumnLabels([member('anna', 'Anna'), member('bruno', 'Bruno')])).toEqual([
      'quota_Anna',
      'quota_Bruno',
    ]);
  });

  it('accoda un frammento di id se due persone hanno lo stesso nome', () => {
    const labels = shareColumnLabels([member('m-aaaaaa1', 'Anna'), member('m-bbbbbb2', 'Anna')]);
    expect(labels).toEqual(['quota_Anna_m-aaaa', 'quota_Anna_m-bbbb']);
    expect(new Set(labels).size).toBe(2);
  });
});

describe('expensesToCsv', () => {
  it('scrive intestazione e una riga per spesa', () => {
    const rows = lines(expensesToCsv(snapshot));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(
      'data,importo,importo_centesimi,valuta,categoria,note,negozio,tag,pagata_da,divisione,' +
        'quota_Anna,quota_Bruno,creata_il,aggiornata_il,cancellata_il,id',
    );
    expect(rows[1]).toBe(
      '2026-07-04,25.00,2500,EUR,Spesa,pane,Esselunga,casa;settimanale,Anna,equal,12.50,12.50,' +
        '2026-07-04T10:00:00.000Z,2026-07-04T10:00:00.000Z,,e1',
    );
  });

  it('antepone il BOM di default, e lo omette su richiesta', () => {
    expect(expensesToCsv(snapshot).startsWith(UTF8_BOM)).toBe(true);
    expect(expensesToCsv(snapshot, { bom: false }).startsWith(UTF8_BOM)).toBe(false);
  });

  it('termina le righe con CRLF, come prescrive RFC 4180', () => {
    expect(expensesToCsv(snapshot, { bom: false })).toContain('\r\n');
  });

  it('esclude le spese cancellate, se non richieste', () => {
    const withDeleted: VaultSnapshot = {
      ...snapshot,
      expenses: [expense(), expense({ id: 'e2', deletedAt: '2026-07-05T10:00:00.000Z' })],
    };
    expect(lines(expensesToCsv(withDeleted))).toHaveLength(2);
    expect(lines(expensesToCsv(withDeleted, { includeDeleted: true }))).toHaveLength(3);
  });

  it('lascia vuota la quota di chi non partecipa alla spesa', () => {
    const single: VaultSnapshot = {
      ...snapshot,
      expenses: [expense({ split: { mode: 'single', shares: { anna: 2500 } } })],
    };
    expect(lines(expensesToCsv(single))[1]).toContain(',single,25.00,,');
  });

  it('scrive l’id grezzo quando la categoria non risolve più', () => {
    const orphan: VaultSnapshot = {
      ...snapshot,
      expenses: [expense({ categoryId: 'sparita' })],
    };
    expect(lines(expensesToCsv(orphan))[1]).toContain(',sparita,');
  });

  it('lascia la cella vuota per una spesa senza categoria', () => {
    const uncategorized: VaultSnapshot = { ...snapshot, expenses: [expense({ categoryId: null })] };
    expect(lines(expensesToCsv(uncategorized))[1]).toBe(
      '2026-07-04,25.00,2500,EUR,,pane,Esselunga,casa;settimanale,Anna,equal,12.50,12.50,' +
        '2026-07-04T10:00:00.000Z,2026-07-04T10:00:00.000Z,,e1',
    );
  });

  it('lascia vuote negozio e tag quando non ci sono', () => {
    const bare: VaultSnapshot = { ...snapshot, expenses: [expense({ store: '', tags: [] })] };
    expect(lines(expensesToCsv(bare))[1]).toContain(',pane,,,Anna,');
  });

  it('unisce i tag con il punto e virgola, non con la virgola', () => {
    // La virgola è il separatore del file: usarla anche dentro la cella sposterebbe
    // tutte le colonne successive.
    const many: VaultSnapshot = {
      ...snapshot,
      expenses: [expense({ tags: ['casa', 'regalo', 'urgente'] })],
    };
    expect(lines(expensesToCsv(many))[1]).toContain(',casa;regalo;urgente,');
  });

  it('disinnesca un negozio che comincia per uguale', () => {
    // Un nome di negozio è testo scelto dall'utente esattamente come la nota, e passa
    // per lo stesso filtro: senza, Excel lo valuterebbe come formula.
    const injected: VaultSnapshot = { ...snapshot, expenses: [expense({ store: '=cmd|x' })] };
    expect(lines(expensesToCsv(injected))[1]).toContain(",'=cmd|x,");
  });

  it('disinnesca ogni tag, non solo il primo', () => {
    // Unirli prima del filtro proteggerebbe solo il primo, e basta un `=` sul secondo
    // perché il foglio di calcolo valuti la cella.
    const injected: VaultSnapshot = {
      ...snapshot,
      expenses: [expense({ tags: ['casa', '=1+1'] })],
    };
    expect(lines(expensesToCsv(injected))[1]).toContain(",casa;'=1+1,");
  });

  it('quota una nota che contiene una virgola, senza spostare le colonne', () => {
    const tricky: VaultSnapshot = { ...snapshot, expenses: [expense({ note: 'pane, latte' })] };
    const row = lines(expensesToCsv(tricky))[1] ?? '';
    expect(row).toContain('"pane, latte"');
    // Le virgole dentro le virgolette non contano come separatori: le colonne restano 16.
    expect(row.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)).toHaveLength(16);
  });

  it('disinnesca una nota che sembra una formula', () => {
    const injected: VaultSnapshot = {
      ...snapshot,
      expenses: [expense({ note: '=HYPERLINK("http://x")' })],
    };
    expect(lines(expensesToCsv(injected))[1]).toContain('"\'=HYPERLINK(""http://x"")"');
  });

  it('produce solo l’intestazione se non ci sono spese', () => {
    expect(lines(expensesToCsv({ ...snapshot, expenses: [] }))).toHaveLength(1);
  });
});

describe('settlementsToCsv', () => {
  const settlement: Settlement = {
    id: 's1',
    fromMember: 'bruno',
    toMember: 'anna',
    amountCents: 1000,
    date: '2026-07-31',
    note: 'bonifico',
    createdAt: '2026-07-31T18:00:00.000Z',
    deletedAt: null,
  };

  it('risolve i nomi dei due membri', () => {
    const rows = lines(settlementsToCsv({ ...snapshot, settlements: [settlement] }));
    expect(rows[0]).toBe('data,importo,importo_centesimi,da,a,note,cancellato_il,id');
    expect(rows[1]).toBe('2026-07-31,10.00,1000,Bruno,Anna,bonifico,,s1');
  });

  it('esclude i pareggi cancellati, se non richiesti', () => {
    const deleted = { ...settlement, id: 's2', deletedAt: '2026-08-01T00:00:00.000Z' };
    const full: VaultSnapshot = { ...snapshot, settlements: [settlement, deleted] };
    expect(lines(settlementsToCsv(full))).toHaveLength(2);
    expect(lines(settlementsToCsv(full, { includeDeleted: true }))).toHaveLength(3);
  });
});
