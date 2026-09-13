import { describe, expect, it } from 'vitest';
import type { Expense, Member, Settlement, VaultSnapshot } from '../model/types';
import { dateSerial, type Cell } from './xlsx/parts';
import { centsToDecimal, shareColumnLabels, toXlsxExport, vaultSheets } from './vault-xlsx';

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

function settlement(overrides: Partial<Settlement> = {}): Settlement {
  return {
    id: 's1',
    fromMember: 'bruno',
    toMember: 'anna',
    amountCents: 1250,
    date: '2026-07-05',
    note: '',
    createdAt: '2026-07-05T09:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

const snapshot: VaultSnapshot = {
  expenses: [expense()],
  categories: [{ id: 'spesa', name: 'Spesa', icon: '🛒', color: '#C2255C', archived: false }],
  members: [member('anna', 'Anna'), member('bruno', 'Bruno')],
  budgets: [],
  settlements: [settlement()],
  vocabulary: [],
};

/** La cella alla colonna `label` della prima riga del foglio. */
function cellAt(sheets: ReturnType<typeof vaultSheets>, sheetName: string, label: string): Cell {
  const sheet = sheets.find((s) => s.name === sheetName)!;
  const index = sheet.header.indexOf(label);
  expect(index).toBeGreaterThanOrEqual(0);
  return sheet.rows[0]![index]!;
}

describe('centsToDecimal', () => {
  it('usa il punto come separatore e due decimali fissi', () => {
    expect(centsToDecimal(2500)).toBe('25.00');
    expect(centsToDecimal(5)).toBe('0.05');
    expect(centsToDecimal(123456)).toBe('1234.56');
  });

  it('non raggruppa le migliaia: il `<v>` di una cella è un numero grezzo', () => {
    expect(centsToDecimal(100000000)).toBe('1000000.00');
  });

  it('porta il segno davanti', () => {
    expect(centsToDecimal(-2500)).toBe('-25.00');
  });

  it('rifiuta i float: un importo non intero è un bug a monte', () => {
    expect(() => centsToDecimal(12.5)).toThrow();
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
    expect(shareColumnLabels([member('aaaaaa11', 'Anna'), member('bbbbbb22', 'Anna')])).toEqual([
      'quota_Anna_aaaaaa',
      'quota_Anna_bbbbbb',
    ]);
  });
});

describe('il foglio Spese', () => {
  it('ha una colonna per persona, con la quota che le compete', () => {
    const sheets = vaultSheets(snapshot);
    expect(cellAt(sheets, 'Spese', 'quota_Anna')).toEqual({ kind: 'money', value: '12.50' });
    expect(cellAt(sheets, 'Spese', 'quota_Bruno')).toEqual({ kind: 'money', value: '12.50' });
  });

  it('non ha più la colonna `importo_centesimi` del CSV', () => {
    // Esisteva perché un decimale in un CSV è ambiguo fra locale. Qui la cella è un numero.
    const sheets = vaultSheets(snapshot);
    expect(sheets[0]!.header).not.toContain('importo_centesimi');
    expect(cellAt(sheets, 'Spese', 'importo')).toEqual({ kind: 'money', value: '25.00' });
  });

  it('scrive la data come data e i timestamp come testo', () => {
    // I timestamp sono UTC ed Excel non ha fuso: convertirli sposterebbe in silenzio il
    // giorno di una spesa creata dopo le 22:00.
    const sheets = vaultSheets(snapshot);
    expect(cellAt(sheets, 'Spese', 'data')).toEqual({ kind: 'date', value: '2026-07-04' });
    expect(cellAt(sheets, 'Spese', 'creata_il')).toEqual({
      kind: 'text',
      value: '2026-07-04T10:00:00.000Z',
    });
  });

  it('lascia vuota la quota di chi non partecipa alla spesa', () => {
    const solo = {
      ...snapshot,
      expenses: [expense({ split: { mode: 'single', shares: { anna: 2500 } } })],
    };
    expect(cellAt(vaultSheets(solo), 'Spese', 'quota_Bruno')).toEqual({ kind: 'empty' });
  });

  it('scrive l’id grezzo quando la categoria non risolve più', () => {
    const orphan = { ...snapshot, expenses: [expense({ categoryId: 'sparita' })] };
    expect(cellAt(vaultSheets(orphan), 'Spese', 'categoria')).toEqual({
      kind: 'text',
      value: 'sparita',
    });
  });

  it('lascia la cella vuota per una spesa senza categoria', () => {
    const none = { ...snapshot, expenses: [expense({ categoryId: null })] };
    expect(cellAt(vaultSheets(none), 'Spese', 'categoria')).toEqual({ kind: 'empty' });
  });

  it('unisce i tag in una cella sola', () => {
    expect(cellAt(vaultSheets(snapshot), 'Spese', 'tag')).toEqual({
      kind: 'text',
      value: 'casa, settimanale',
    });
  });

  it('risolve il nome di chi ha pagato', () => {
    expect(cellAt(vaultSheets(snapshot), 'Spese', 'pagata_da')).toEqual({
      kind: 'text',
      value: 'Anna',
    });
  });
});

describe('le formule non si disinnescano', () => {
  it('lascia intatta una nota che comincia per uguale', () => {
    // Il CSV le anteponeva un apice, perché Excel le avrebbe valutate. Una cella
    // `inlineStr` non è mai una formula: anteporre l'apice **corromperebbe** il testo.
    const formula = { ...snapshot, expenses: [expense({ note: '=SOMMA(A1:A9)' })] };
    expect(cellAt(vaultSheets(formula), 'Spese', 'note')).toEqual({
      kind: 'text',
      value: '=SOMMA(A1:A9)',
    });
  });

  it('lascia intatti anche negozio e tag che cominciano per uguale o meno', () => {
    const formula = {
      ...snapshot,
      expenses: [expense({ store: '+Conad', tags: ['-sconto', '@casa'] })],
    };
    const sheets = vaultSheets(formula);
    expect(cellAt(sheets, 'Spese', 'negozio')).toEqual({ kind: 'text', value: '+Conad' });
    expect(cellAt(sheets, 'Spese', 'tag')).toEqual({ kind: 'text', value: '-sconto, @casa' });
  });

  it('l’apice non compare nel file prodotto', () => {
    const formula = { ...snapshot, expenses: [expense({ note: '=SOMMA(A1:A9)' })] };
    const xml = new TextDecoder().decode(toXlsxExport(formula));
    expect(xml).toContain('=SOMMA(A1:A9)');
    expect(xml).not.toContain("'=SOMMA");
  });
});

describe('le cancellazioni', () => {
  const withDeleted: VaultSnapshot = {
    ...snapshot,
    expenses: [expense(), expense({ id: 'e2', deletedAt: '2026-07-06T08:00:00.000Z' })],
    settlements: [settlement(), settlement({ id: 's2', deletedAt: '2026-07-06T08:00:00.000Z' })],
  };

  it('per default restano fuori, così la somma di una colonna torna', () => {
    // È la ragione per cui questo formato esiste: si seleziona «importo» e si legge un
    // totale. Righe cancellate dentro quella colonna darebbero un numero che non
    // corrisponde a niente di ciò che l'app mostra.
    const sheets = vaultSheets(withDeleted);
    expect(sheets[0]!.rows).toHaveLength(1);
    expect(sheets[1]!.rows).toHaveLength(1);
  });

  it('senza cancellate, la colonna `cancellata_il` non c’è nemmeno', () => {
    const sheets = vaultSheets(withDeleted);
    expect(sheets[0]!.header).not.toContain('cancellata_il');
    expect(sheets[1]!.header).not.toContain('cancellato_il');
  });

  it('su richiesta entrano, e la colonna compare con la data', () => {
    const sheets = vaultSheets(withDeleted, { includeDeleted: true });
    expect(sheets[0]!.rows).toHaveLength(2);
    expect(sheets[0]!.header).toContain('cancellata_il');

    const index = sheets[0]!.header.indexOf('cancellata_il');
    expect(sheets[0]!.rows[1]![index]).toEqual({
      kind: 'text',
      value: '2026-07-06T08:00:00.000Z',
    });
  });
});

describe('il foglio Pareggi', () => {
  it('è un foglio a parte, perché i pareggi non sono spese', () => {
    // In un unico foglio qualcuno sommerebbe due colonne che non vanno sommate.
    expect(vaultSheets(snapshot).map((s) => s.name)).toEqual(['Spese', 'Pareggi']);
  });

  it('risolve i nomi dei due membri', () => {
    const sheets = vaultSheets(snapshot);
    expect(cellAt(sheets, 'Pareggi', 'da')).toEqual({ kind: 'text', value: 'Bruno' });
    expect(cellAt(sheets, 'Pareggi', 'a')).toEqual({ kind: 'text', value: 'Anna' });
  });
});

describe('toXlsxExport', () => {
  const empty: VaultSnapshot = {
    expenses: [],
    categories: [],
    members: [],
    budgets: [],
    settlements: [],
    vocabulary: [],
  };

  it('produce uno ZIP, riconoscibile dai suoi primi due byte', () => {
    const file = toXlsxExport(snapshot);
    expect(file[0]).toBe(0x50); // 'P'
    expect(file[1]).toBe(0x4b); // 'K'
  });

  it('mette `[Content_Types].xml` come prima voce dell’archivio', () => {
    // Alcuni lettori di OOXML lo cercano all'inizio invece di passare dall'indice.
    const file = toXlsxExport(snapshot);
    const name = String.fromCharCode(...file.slice(30, 30 + 19));
    expect(name).toBe('[Content_Types].xml');
  });

  it('funziona su un vault vuoto: due fogli con la sola intestazione', () => {
    const sheets = vaultSheets(empty);
    expect(sheets).toHaveLength(2);
    expect(sheets[0]!.rows).toEqual([]);
    expect(() => toXlsxExport(empty)).not.toThrow();
  });

  it('non contiene mai la chiave del vault', () => {
    // Stessa garanzia dell'export JSON, e per la stessa ragione: questo file è in chiaro.
    const text = new TextDecoder().decode(toXlsxExport(snapshot));
    expect(text).not.toMatch(/vaultKey|JTBK1\./);
  });

  it('è deterministico: lo stesso snapshot dà gli stessi byte', () => {
    expect(toXlsxExport(snapshot)).toEqual(toXlsxExport(snapshot));
  });

  it('la data che finisce nel file è il seriale, non la stringa ISO', () => {
    const text = new TextDecoder().decode(toXlsxExport(snapshot));
    expect(text).toContain(`<v>${dateSerial('2026-07-04')}</v>`);
  });
});
