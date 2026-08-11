import { describe, expect, it } from 'vitest';
import { buildVaultExport, EXPORT_FORMAT_VERSION, toJsonExport, type VaultExport } from './json';
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
  ],
  categories: [{ id: 'spesa', name: 'Spesa', icon: '🛒', color: '#C2255C', archived: false }],
  members: [{ id: 'anna', name: 'Anna', color: '#000000' }],
  budgets: [{ categoryId: 'spesa', month: '2026-07', limitCents: 30000 }],
  settlements: [],
};

const fixedNow = (): Date => new Date('2026-08-01T12:00:00.000Z');

describe('buildVaultExport', () => {
  it('marca formato, versione e istante', () => {
    expect(buildVaultExport(snapshot, { now: fixedNow })).toMatchObject({
      format: 'jutrack-export',
      version: EXPORT_FORMAT_VERSION,
      exportedAt: '2026-08-01T12:00:00.000Z',
    });
  });

  it('riporta tutte e cinque le collezioni, anche quelle vuote', () => {
    const exported = buildVaultExport(snapshot, { now: fixedNow });
    expect(Object.keys(exported)).toEqual(
      expect.arrayContaining(['expenses', 'categories', 'members', 'budgets', 'settlements']),
    );
    expect(exported.settlements).toEqual([]);
  });
});

describe('toJsonExport', () => {
  it('produce JSON valido che rilegge identico', () => {
    const parsed = JSON.parse(toJsonExport(snapshot, { now: fixedNow })) as VaultExport;
    expect(parsed.expenses).toEqual(snapshot.expenses);
    expect(parsed.budgets).toEqual(snapshot.budgets);
  });

  it('conserva gli importi come interi in centesimi', () => {
    const parsed = JSON.parse(toJsonExport(snapshot, { now: fixedNow })) as VaultExport;
    expect(parsed.expenses[0]?.amountCents).toBe(2500);
    expect(parsed.budgets[0]?.limitCents).toBe(30000);
  });

  it('conserva le spese cancellate: un backup che perde i tombstone non è un backup', () => {
    const withTombstone: VaultSnapshot = {
      ...snapshot,
      expenses: [{ ...snapshot.expenses[0]!, id: 'e2', deletedAt: '2026-07-05T10:00:00.000Z' }],
    };
    const parsed = JSON.parse(toJsonExport(withTombstone, { now: fixedNow })) as VaultExport;
    expect(parsed.expenses[0]?.deletedAt).toBe('2026-07-05T10:00:00.000Z');
  });

  it('conserva negozio e tag della spesa', () => {
    const parsed = JSON.parse(toJsonExport(snapshot, { now: fixedNow })) as VaultExport;
    expect(parsed.expenses[0]?.store).toBe('Esselunga');
    expect(parsed.expenses[0]?.tags).toEqual(['casa']);
  });

  it('non contiene mai la chiave del vault', () => {
    const text = toJsonExport(snapshot, { now: fixedNow });
    expect(text).not.toMatch(/vaultKey|contentKey|authKey|JTBK1/);
  });

  it('termina con un a capo, come ogni file di testo che si rispetti', () => {
    expect(toJsonExport(snapshot, { now: fixedNow }).endsWith('}\n')).toBe(true);
  });
});
