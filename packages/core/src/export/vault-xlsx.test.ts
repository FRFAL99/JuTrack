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
    const names = vaultSheets(snapshot).map((s) => s.name);
    expect(names.slice(0, 2)).toEqual(['Spese', 'Pareggi']);
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

  it('funziona su un vault vuoto: i fogli ci sono, con la sola intestazione', () => {
    const sheets = vaultSheets(empty);
    expect(sheets).toHaveLength(7);
    // Tutti vuoti tranne il Riepilogo, che ha comunque i titoli delle sue sezioni.
    for (const s of sheets.filter((x) => x.name !== 'Riepilogo')) {
      expect(s.rows).toEqual([]);
    }
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

/* -------------------------------------------------------------------------- */
/* Step 62 — il file contiene tutto il gruppo                                  */
/* -------------------------------------------------------------------------- */

/** Il foglio col nome dato. */
function sheet(sheets: ReturnType<typeof vaultSheets>, name: string) {
  return sheets.find((s) => s.name === name)!;
}

/** Le celle di una riga che comincia con un certo testo, nel Riepilogo. */
function sectionRows(sheets: ReturnType<typeof vaultSheets>, title: string): Cell[][] {
  const rows = sheet(sheets, 'Riepilogo').rows;
  const start = rows.findIndex((row) => row[0]?.kind === 'heading' && row[0].value === title);
  expect(start).toBeGreaterThanOrEqual(0);

  const out: Cell[][] = [];
  for (let i = start + 1; i < rows.length; i++) {
    const row = rows[i]!;
    // La sezione finisce alla riga vuota che precede il titolo successivo.
    if (row.length === 0 || row[0]?.kind === 'heading') break;
    out.push(row);
  }
  return out;
}

const ricco: VaultSnapshot = {
  ...snapshot,
  categories: [
    { id: 'spesa', name: 'Spesa', icon: '🛒', color: '#C2255C', archived: false },
    { id: 'vecchia', name: 'Vecchia', icon: '📦', color: '#888888', archived: true },
  ],
  budgets: [{ categoryId: 'spesa', month: '2026-07', limitCents: 10000 }],
  vocabulary: [
    { kind: 'tag', key: 'casa', name: 'casa', deletedAt: null },
    { kind: 'store', key: 'esselunga', name: 'Esselunga', deletedAt: null },
  ],
};

describe('i sette fogli', () => {
  it('sono nell’ordine in cui compaiono le linguette: i dati prima, il riepilogo in fondo', () => {
    expect(vaultSheets(ricco).map((s) => s.name)).toEqual([
      'Spese',
      'Pareggi',
      'Categorie',
      'Budget',
      'Persone',
      'Vocabolario',
      'Riepilogo',
    ]);
  });

  it('non hanno nomi che Excel rifiuta, e il file si costruisce', () => {
    expect(() => toXlsxExport(ricco)).not.toThrow();
  });
});

describe('il foglio Categorie', () => {
  it('contiene anche le archiviate, perché le spese vecchie le riferiscono ancora', () => {
    const rows = sheet(vaultSheets(ricco), 'Categorie').rows;
    expect(rows).toHaveLength(2);
    expect(rows[1]![0]).toEqual({ kind: 'text', value: 'Vecchia' });
    expect(rows[1]![3]).toEqual({ kind: 'text', value: 'sì' });
    expect(rows[0]![3]).toEqual({ kind: 'empty' });
  });
});

describe('il foglio Budget', () => {
  it('dice quanto è stato speso davvero, non solo il limite', () => {
    // La spesa di prova è 25.00 su un limite di 100.00 nello stesso mese.
    const rows = sheet(vaultSheets(ricco), 'Budget').rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.map((c) => (c.kind === 'empty' ? '' : c.value))).toEqual([
      '2026-07',
      'Spesa',
      '100.00',
      '25.00',
      '75.00',
      'sotto',
    ]);
  });

  it('usa le parole della schermata budget, non altre', () => {
    const sforato: VaultSnapshot = {
      ...ricco,
      budgets: [{ categoryId: 'spesa', month: '2026-07', limitCents: 1000 }],
    };
    const rows = sheet(vaultSheets(sforato), 'Budget').rows;
    expect(rows[0]![5]).toEqual({ kind: 'text', value: 'superato' });
    // Il resto è negativo, e `centsToDecimal` porta il segno davanti.
    expect(rows[0]![4]).toEqual({ kind: 'money', value: '-15.00' });
  });
});

describe('il foglio Vocabolario', () => {
  it('traduce il tipo invece di scrivere «store»', () => {
    const rows = sheet(vaultSheets(ricco), 'Vocabolario').rows;
    expect(rows[0]![0]).toEqual({ kind: 'text', value: 'tag' });
    expect(rows[1]![0]).toEqual({ kind: 'text', value: 'negozio' });
  });
});

describe('il foglio Riepilogo', () => {
  it('non ha intestazione, quindi niente filtro e niente riga congelata', () => {
    // Le colonne non hanno un significato unico per tutta l'altezza: la A è un mese, poi
    // una categoria, poi una persona.
    const riepilogo = sheet(vaultSheets(ricco), 'Riepilogo');
    expect(riepilogo.header).toEqual([]);

    const xml = new TextDecoder().decode(toXlsxExport(ricco));
    expect(xml).not.toContain('<autoFilter ref="A1:1"/>');
  });

  it('**il totale per mese coincide con la somma della colonna importo di Spese**', () => {
    // È l'invariante che tiene insieme i due fogli: se divergessero, chi legge il file non
    // saprebbe a quale credere — e nessuno dei due direbbe di essere quello sbagliato.
    const sheets = vaultSheets(ricco);

    const spese = sheet(sheets, 'Spese');
    const importo = spese.header.indexOf('importo');
    const sommaSpese = spese.rows.reduce((sum, row) => {
      const cell = row[importo]!;
      return sum + (cell.kind === 'money' ? Number(cell.value) : 0);
    }, 0);

    const sommaRiepilogo = sectionRows(sheets, 'Per mese').reduce((sum, row) => {
      const cell = row[2]!;
      return sum + (cell.kind === 'money' ? Number(cell.value) : 0);
    }, 0);

    expect(sommaRiepilogo).toBeCloseTo(sommaSpese, 2);
    expect(sommaRiepilogo).toBeCloseTo(25, 2);
  });

  it('nomina le spese senza categoria invece di lasciare una riga muta', () => {
    const senza: VaultSnapshot = { ...ricco, expenses: [expense({ categoryId: null })] };
    const righe = sectionRows(vaultSheets(senza), 'Per categoria');
    expect(righe[0]![0]).toEqual({ kind: 'text', value: 'senza categoria' });
  });

  it('scrive la quota come percentuale, con il valore ancora fra 0 e 1', () => {
    const righe = sectionRows(vaultSheets(ricco), 'Per categoria');
    expect(righe[0]![3]).toEqual({ kind: 'percent', value: '1.0000' });
  });

  it('i saldi sono quelli di computeBalances, pareggi compresi', () => {
    // Anna ha pagato 25.00 e gliene spettano 12.50; ha ricevuto un pareggio da 12.50.
    const righe = sectionRows(vaultSheets(ricco), 'Saldi');
    const anna = righe.find((r) => r[0]?.kind === 'text' && r[0].value === 'Anna')!;
    expect(anna.map((c) => (c.kind === 'empty' ? '' : c.value))).toEqual([
      'Anna',
      '25.00',
      '12.50',
      '-12.50',
      '0.00',
    ]);
  });

  it('quando non c’è niente da saldare lo dice, invece di lasciare la sezione vuota', () => {
    const righe = sectionRows(vaultSheets(ricco), 'Chi deve dare a chi');
    expect(righe[0]![0]).toEqual({ kind: 'text', value: 'Siete in pari.' });
  });

  it('elenca i pagamenti minimi quando i conti non tornano', () => {
    const aperto: VaultSnapshot = { ...ricco, settlements: [] };
    const righe = sectionRows(vaultSheets(aperto), 'Chi deve dare a chi');
    expect(righe[0]!.map((c) => (c.kind === 'empty' ? '' : c.value))).toEqual([
      'Bruno',
      '→ Anna',
      '12.50',
    ]);
  });

  it('le spese cancellate non entrano nei totali', () => {
    const conCancellata: VaultSnapshot = {
      ...ricco,
      expenses: [
        expense(),
        expense({ id: 'e2', amountCents: 9900, deletedAt: '2026-07-06T08:00:00.000Z' }),
      ],
    };
    const righe = sectionRows(vaultSheets(conCancellata), 'Per mese');
    const totale = righe.reduce((sum, row) => {
      const cell = row[2]!;
      return sum + (cell.kind === 'money' ? Number(cell.value) : 0);
    }, 0);
    expect(totale).toBeCloseTo(25, 2);
  });
});
