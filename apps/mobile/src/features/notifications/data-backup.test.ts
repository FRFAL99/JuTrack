import { describe, expect, it } from 'vitest';
import type { BackupMarks } from '@/features/backup/auto';
import {
  parseDataBackupMarks,
  pruneDataBackupMarks,
  reviewDataBackup,
  serializeDataBackupMarks,
  type DataBackupMarks,
} from './data-backup';

const T = 1_760_000_000_000;

/** Il giro minimo, con i valori che quasi ogni test sovrascrive in parte. */
function review(over: {
  expenseCount: number;
  backupMarks?: BackupMarks;
  marks?: DataBackupMarks;
  knownVaultIds?: string[];
}) {
  return reviewDataBackup({
    vaultId: 'v1',
    expenseCount: over.expenseCount,
    backupMarks: over.backupMarks ?? {},
    marks: over.marks ?? {},
    knownVaultIds: over.knownVaultIds ?? ['v1'],
  });
}

describe('parseDataBackupMarks', () => {
  it('rilegge quello che ha scritto', () => {
    const marks: DataBackupMarks = { v1: { warnedFor: T } };
    expect(parseDataBackupMarks(serializeDataBackupMarks(marks))).toEqual(marks);
  });

  it('un segno illeggibile vale «mai avvisato»', () => {
    // Direzione opposta a `backup.ts`, e deliberata: là un segno rotto deve valere «chiave
    // a rischio»; qui il dato non è a rischio, e il solo danno possibile è un avviso in più.
    expect(parseDataBackupMarks('non è json')).toEqual({});
    expect(parseDataBackupMarks(JSON.stringify({ v1: { warnedFor: 'ieri' } }))).toEqual({});
  });

  it('scarta un segno per volta, non l’intera tabella', () => {
    const raw = JSON.stringify({ buono: { warnedFor: T }, rotto: {} });
    expect(Object.keys(parseDataBackupMarks(raw))).toEqual(['buono']);
  });
});

describe('reviewDataBackup — la soglia', () => {
  it('sotto soglia non dice niente e non registra niente', () => {
    const result = review({ expenseCount: 19 });
    expect(result.alert).toBeNull();
    expect(result.changed).toBe(false);
  });

  it('a venti spese non salvate avvisa', () => {
    const result = review({ expenseCount: 20 });
    expect(result.alert).toEqual({ vaultId: 'v1', newExpenses: 20, never: true });
  });

  it('**conta le spese entrate dopo l’ultimo backup, non tutte**', () => {
    // È la differenza con lo Step 43: là la soglia misura quanto c'è dentro, qui quanto
    // c'è dentro **e non è ancora al sicuro**.
    const backupMarks: BackupMarks = { v1: { lastBackupAt: T, expenseCount: 100 } };
    expect(review({ expenseCount: 110, backupMarks }).alert).toBeNull();
    expect(review({ expenseCount: 125, backupMarks }).alert).toMatchObject({ newExpenses: 25 });
  });

  it('un gruppo fermo non viene avvisato, per quanto vecchio sia il backup', () => {
    // Avvisarlo insegnerebbe a ignorare l'avviso proprio prima che diventi vero.
    const backupMarks: BackupMarks = { v1: { lastBackupAt: T - 999_999_999, expenseCount: 40 } };
    expect(review({ expenseCount: 40, backupMarks }).alert).toBeNull();
  });

  it('**più cancellazioni che spese nuove non producono un numero negativo**', () => {
    // Senza il `Math.max` la differenza negativa finirebbe dritta dentro la frase.
    const backupMarks: BackupMarks = { v1: { lastBackupAt: T, expenseCount: 50 } };
    const result = review({ expenseCount: 10, backupMarks });
    expect(result.alert).toBeNull();
  });
});

describe('reviewDataBackup — un avviso per backup, e poi si riarma', () => {
  it('non ripete l’avviso per lo stesso backup', () => {
    const backupMarks: BackupMarks = { v1: { lastBackupAt: T, expenseCount: 0 } };
    const first = review({ expenseCount: 30, backupMarks });
    expect(first.alert).not.toBeNull();

    const second = review({ expenseCount: 40, backupMarks, marks: first.marks });
    expect(second.alert).toBeNull();
    expect(second.changed).toBe(false);
  });

  it('**un backup nuovo riarma l’avviso**', () => {
    // È la sola differenza con lo Step 43, dove salvare la chiave toglie il gruppo dal giro
    // per sempre. Qui i dati continuano a cambiare, quindi l'avviso deve poter tornare.
    const primo: BackupMarks = { v1: { lastBackupAt: T, expenseCount: 0 } };
    const avvisato = review({ expenseCount: 30, backupMarks: primo }).marks;

    // Backup rifatto: `lastBackupAt` cambia, il conteggio riparte da 30.
    const secondo: BackupMarks = { v1: { lastBackupAt: T + 100, expenseCount: 30 } };
    expect(review({ expenseCount: 35, backupMarks: secondo, marks: avvisato }).alert).toBeNull();
    expect(review({ expenseCount: 60, backupMarks: secondo, marks: avvisato }).alert).toMatchObject(
      { newExpenses: 30, never: false },
    );
  });

  it('distingue «mai fatto» da «vecchio», perché il rimedio è diverso', () => {
    // Senza cartella scelta il rimedio è sceglierne una; con una cartella è fare un backup
    // adesso. La stessa frase manderebbe il primo a cercare un bottone che non ha.
    expect(review({ expenseCount: 30 }).alert).toMatchObject({ never: true });
    const backupMarks: BackupMarks = { v1: { lastBackupAt: T, expenseCount: 0 } };
    expect(review({ expenseCount: 30, backupMarks }).alert).toMatchObject({ never: false });
  });
});

describe('reviewDataBackup — la potatura', () => {
  it('butta via i segni dei gruppi spariti, e lo segnala', () => {
    const marks: DataBackupMarks = { v1: { warnedFor: T }, sparito: { warnedFor: T } };
    const result = review({ expenseCount: 0, marks, knownVaultIds: ['v1'] });
    expect(Object.keys(result.marks)).toEqual(['v1']);
    expect(result.changed).toBe(true);
  });
});

describe('pruneDataBackupMarks', () => {
  it('tiene solo i gruppi che esistono ancora', () => {
    const marks: DataBackupMarks = { a: { warnedFor: 1 }, b: { warnedFor: 2 } };
    expect(Object.keys(pruneDataBackupMarks(marks, ['b']))).toEqual(['b']);
  });
});
