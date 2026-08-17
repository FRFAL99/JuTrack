import { describe, expect, it } from 'vitest';
import { parseVaultExport, totalKept, type ImportResult } from './import';
import { toJsonExport } from './json';
import type { VaultSnapshot } from '../model/types';

const snapshot: VaultSnapshot = {
  expenses: [
    {
      id: 'e1',
      amountCents: 2500,
      currency: 'EUR',
      date: '2026-07-04',
      categoryId: 'spesa',
      note: 'pane',
      store: 'Esselunga',
      tags: ['casa'],
      paidBy: 'anna',
      split: { mode: 'equal', shares: { anna: 1250, bruno: 1250 } },
      createdAt: '2026-07-04T10:00:00.000Z',
      updatedAt: '2026-07-04T10:00:00.000Z',
      deletedAt: null,
    },
    {
      id: 'e2',
      amountCents: 1000,
      currency: 'EUR',
      date: '2026-07-05',
      categoryId: null,
      note: 'cancellata',
      store: '',
      tags: [],
      paidBy: 'bruno',
      split: { mode: 'single', shares: { bruno: 1000 } },
      createdAt: '2026-07-05T10:00:00.000Z',
      updatedAt: '2026-07-05T11:00:00.000Z',
      deletedAt: '2026-07-05T12:00:00.000Z',
    },
  ],
  categories: [{ id: 'spesa', name: 'Spesa', icon: '🛒', color: '#C2255C', archived: false }],
  members: [
    { id: 'anna', name: 'Anna', color: '#3B5BDB' },
    { id: 'bruno', name: 'Bruno', color: '#2F9E44' },
  ],
  budgets: [{ categoryId: 'spesa', month: '2026-07', limitCents: 30000 }],
  settlements: [
    {
      id: 's1',
      fromMember: 'bruno',
      toMember: 'anna',
      amountCents: 500,
      date: '2026-07-06',
      note: 'resto',
      createdAt: '2026-07-06T10:00:00.000Z',
      deletedAt: null,
    },
  ],
};

/** Il file buono, come lo produce l'app. Da qui in giù si guasta un pezzo per volta. */
const goodFile = toJsonExport(snapshot);

/** Il file con una modifica chirurgica: è così che si simula un file manomesso. */
function fileWith(mutate: (root: Record<string, unknown>) => void): string {
  const root = JSON.parse(goodFile) as Record<string, unknown>;
  mutate(root);
  return JSON.stringify(root);
}

function expectOk(result: ImportResult): Extract<ImportResult, { ok: true }> {
  if (!result.ok) throw new Error(`atteso un import riuscito, rifiutato con: ${result.reason}`);
  return result;
}

describe('parseVaultExport — il giro completo', () => {
  it('rilegge identico ciò che toJsonExport ha scritto', () => {
    const { snapshot: read } = expectOk(parseVaultExport(goodFile));
    expect(read).toEqual(snapshot);
  });

  it('non scarta niente da un file non toccato', () => {
    const { report } = expectOk(parseVaultExport(goodFile));
    expect(report.skipped).toEqual([]);
    expect(totalKept(report.kept)).toBe(7);
  });

  it('conserva i tombstone: un import che li perde resuscita le spese cancellate', () => {
    const { snapshot: read } = expectOk(parseVaultExport(goodFile));
    expect(read.expenses.find((e) => e.id === 'e2')?.deletedAt).toBe('2026-07-05T12:00:00.000Z');
  });

  it('conserva gli id, perché paidBy e le quote li riferiscono', () => {
    const { snapshot: read } = expectOk(parseVaultExport(goodFile));
    const expense = read.expenses.find((e) => e.id === 'e1');
    expect(expense?.paidBy).toBe('anna');
    expect(Object.keys(expense?.split.shares ?? {})).toEqual(['anna', 'bruno']);
  });

  it('riporta la versione e l’istante dichiarati dal file', () => {
    const { report } = expectOk(parseVaultExport(toJsonExport(snapshot)));
    expect(report.version).toBe(2);
    expect(report.exportedAt).not.toBeNull();
  });
});

describe('parseVaultExport — il file intero si rifiuta', () => {
  it('quando non è JSON', () => {
    const result = parseVaultExport('{ questo non è json');
    expect(result.ok).toBe(false);
  });

  it('quando è JSON ma non è un oggetto', () => {
    expect(parseVaultExport('[1, 2, 3]').ok).toBe(false);
    expect(parseVaultExport('"una stringa"').ok).toBe(false);
  });

  it('quando il formato è di qualcun altro', () => {
    const result = parseVaultExport(fileWith((root) => (root.format = 'altra-app')));
    expect(result.ok).toBe(false);
  });

  it('quando la versione è futura: leggerlo a metà scriverebbe dati mutilati', () => {
    const result = parseVaultExport(fileWith((root) => (root.version = 99)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/v99/);
  });

  it('quando la versione non è un intero', () => {
    expect(parseVaultExport(fileWith((root) => (root.version = '2'))).ok).toBe(false);
    expect(parseVaultExport(fileWith((root) => (root.version = 0))).ok).toBe(false);
  });
});

describe('parseVaultExport — le versioni vecchie si leggono', () => {
  it('un file v1 senza negozio né tag entra con i fallback di readExpense', () => {
    const v1 = fileWith((root) => {
      root.version = 1;
      root.expenses = (root.expenses as Record<string, unknown>[]).map((expense) => {
        const { store, tags, ...rest } = expense;
        void store;
        void tags;
        return rest;
      });
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(v1));
    expect(report.version).toBe(1);
    expect(report.skipped).toEqual([]);
    expect(read.expenses[0]?.store).toBe('');
    expect(read.expenses[0]?.tags).toEqual([]);
  });
});

describe('parseVaultExport — le invarianti del modello si difendono alla porta', () => {
  it('scarta una spesa le cui quote non sommano all’importo', () => {
    const file = fileWith((root) => {
      const expenses = root.expenses as Record<string, unknown>[];
      expenses[0]!.split = { mode: 'equal', shares: { anna: 1250, bruno: 1000 } };
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(file));
    expect(read.expenses.map((e) => e.id)).toEqual(['e2']);
    expect(report.skipped).toContainEqual({
      kind: 'expense',
      id: 'e1',
      reason: 'le quote sommano a 2250 invece di 2500 centesimi',
    });
  });

  it('scarta una spesa con un importo float, invece di arrotondarlo', () => {
    const file = fileWith((root) => {
      const expenses = root.expenses as Record<string, unknown>[];
      expenses[0]!.amountCents = 25.5;
    });

    const { report } = expectOk(parseVaultExport(file));
    expect(report.skipped[0]).toMatchObject({
      id: 'e1',
      reason: expect.stringContaining('intero'),
    });
  });

  it('scarta una spesa pagata da una persona che non è nel file', () => {
    const file = fileWith((root) => {
      const expenses = root.expenses as Record<string, unknown>[];
      expenses[0]!.paidBy = 'fantasma';
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(file));
    expect(read.expenses.map((e) => e.id)).toEqual(['e2']);
    expect(report.skipped[0]?.reason).toMatch(/non è nel file/);
  });

  it('scarta una spesa con una quota intestata a un id sconosciuto', () => {
    const file = fileWith((root) => {
      const expenses = root.expenses as Record<string, unknown>[];
      expenses[0]!.split = { mode: 'equal', shares: { anna: 1250, fantasma: 1250 } };
    });

    const { report } = expectOk(parseVaultExport(file));
    expect(report.skipped[0]?.reason).toMatch(/non è nel file/);
  });

  it('scarta un pareggio fra una persona e sé stessa', () => {
    const file = fileWith((root) => {
      const settlements = root.settlements as Record<string, unknown>[];
      settlements[0]!.toMember = 'bruno';
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(file));
    expect(read.settlements).toEqual([]);
    expect(report.skipped[0]?.reason).toMatch(/stessa persona/);
  });

  it('scarta un pareggio con importo zero o negativo', () => {
    const zero = fileWith((root) => {
      (root.settlements as Record<string, unknown>[])[0]!.amountCents = 0;
    });
    expect(expectOk(parseVaultExport(zero)).snapshot.settlements).toEqual([]);
  });
});

describe('parseVaultExport — i riferimenti morti', () => {
  it('la spesa entra senza categoria invece di essere persa', () => {
    const file = fileWith((root) => {
      root.categories = [];
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(file));
    expect(read.expenses).toHaveLength(2);
    expect(read.expenses.find((e) => e.id === 'e1')?.categoryId).toBeNull();
    expect(report.skipped).toContainEqual({
      kind: 'expense',
      id: 'e1',
      reason: 'categoria non presente nel file: la spesa entra senza categoria',
    });
  });

  it('il budget invece si scarta: senza categoria non comparirebbe da nessuna parte', () => {
    const file = fileWith((root) => {
      root.categories = [];
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(file));
    expect(read.budgets).toEqual([]);
    expect(report.skipped).toContainEqual({
      kind: 'budget',
      id: 'spesa:2026-07',
      reason: 'categoria non presente nel file',
    });
  });

  it('scarta un budget con un mese malformato', () => {
    const file = fileWith((root) => {
      (root.budgets as Record<string, unknown>[])[0]!.month = 'luglio';
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(file));
    expect(read.budgets).toEqual([]);
    expect(report.skipped[0]?.reason).toMatch(/AAAA-MM/);
  });
});

describe('parseVaultExport — record malformati', () => {
  it('scarta i record senza id e dice quale famiglia', () => {
    const file = fileWith((root) => {
      const expenses = root.expenses as Record<string, unknown>[];
      delete expenses[0]!.id;
    });

    const { report } = expectOk(parseVaultExport(file));
    expect(report.skipped).toContainEqual({
      kind: 'expense',
      id: '(senza id)',
      reason: 'manca l’identificatore',
    });
  });

  it('tiene il primo di due record con lo stesso id e segnala il secondo', () => {
    const file = fileWith((root) => {
      const members = root.members as Record<string, unknown>[];
      members.push({ id: 'anna', name: 'Anna doppia', color: '#000000' });
    });

    const { snapshot: read, report } = expectOk(parseVaultExport(file));
    expect(read.members.filter((m) => m.id === 'anna')).toHaveLength(1);
    expect(read.members.find((m) => m.id === 'anna')?.name).toBe('Anna');
    expect(report.skipped).toContainEqual({
      kind: 'member',
      id: 'anna',
      reason: 'identificatore ripetuto nel file',
    });
  });

  it('scarta un membro senza nome: ogni saldo parlerebbe di uno sconosciuto', () => {
    const file = fileWith((root) => {
      (root.members as Record<string, unknown>[])[0]!.name = '';
    });

    const { report } = expectOk(parseVaultExport(file));
    expect(report.skipped).toContainEqual({ kind: 'member', id: 'anna', reason: 'manca il nome' });
  });

  it('ignora gli elementi che non sono nemmeno oggetti', () => {
    const file = fileWith((root) => {
      root.members = [...(root.members as unknown[]), 'anna', 42, null];
    });

    const { snapshot: read } = expectOk(parseVaultExport(file));
    expect(read.members).toHaveLength(2);
  });

  it('una collezione mancante vale come vuota, non come file rotto', () => {
    const file = fileWith((root) => {
      delete root.settlements;
      delete root.budgets;
    });

    const { snapshot: read } = expectOk(parseVaultExport(file));
    expect(read.settlements).toEqual([]);
    expect(read.budgets).toEqual([]);
    expect(read.expenses).toHaveLength(2);
  });

  it('un file senza alcun record è valido ma non ha niente da importare', () => {
    const empty = toJsonExport({
      expenses: [],
      categories: [],
      members: [],
      budgets: [],
      settlements: [],
    });

    const { report } = expectOk(parseVaultExport(empty));
    expect(totalKept(report.kept)).toBe(0);
  });
});

describe('parseVaultExport — i metadati mancanti non fanno perdere il record', () => {
  it('una spesa senza createdAt ripiega sulla data', () => {
    const file = fileWith((root) => {
      const expenses = root.expenses as Record<string, unknown>[];
      delete expenses[0]!.createdAt;
      delete expenses[0]!.updatedAt;
    });

    const { snapshot: read } = expectOk(parseVaultExport(file));
    const expense = read.expenses.find((e) => e.id === 'e1');
    expect(expense?.createdAt).toBe('2026-07-04');
    expect(expense?.updatedAt).toBe('2026-07-04');
  });

  it('una categoria senza icona o colore prende i default di readCategory', () => {
    const file = fileWith((root) => {
      const categories = root.categories as Record<string, unknown>[];
      delete categories[0]!.icon;
      delete categories[0]!.color;
    });

    const { snapshot: read } = expectOk(parseVaultExport(file));
    expect(read.categories[0]).toMatchObject({ icon: '📦', color: '#888888' });
  });

  it('scarta dai tag tutto ciò che stringa non è, senza perdere la spesa', () => {
    const file = fileWith((root) => {
      (root.expenses as Record<string, unknown>[])[0]!.tags = ['casa', 42, null, 'spesa'];
    });

    const { snapshot: read } = expectOk(parseVaultExport(file));
    expect(read.expenses.find((e) => e.id === 'e1')?.tags).toEqual(['casa', 'spesa']);
  });
});
